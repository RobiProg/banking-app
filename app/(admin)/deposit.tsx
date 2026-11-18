import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { TextInput } from '../../components/ui/TextInput';
import { colors } from '../../constants/colors';
import { radius, shadows, spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { lookupRecipient } from '../../services/accounts';
import { listActiveBranches } from '../../services/branches';
import { recordBranchDeposit } from '../../services/admin';
import type { Branch, RecipientLookupInfo, Transaction } from '../../types/db';
import { formatBDT, formatDateTime, isValidBankingAmount } from '../../utils/format';

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

/**
 * Staff Simulated Branch Deposit Screen (SRS v2.2 FR-DEP-01..08, TC-11, TC-12).
 * Styled to match SmartBank Figma UI design system.
 */
export default function AdminBranchDepositScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ account?: string }>();

  // Branch list
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  // Recipient lookup
  const [accountNumber, setAccountNumber] = useState(searchParams.account ? searchParams.account.toUpperCase() : '');
  const [lookingUp, setLookingUp] = useState(false);
  const [recipient, setRecipient] = useState<RecipientLookupInfo | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Amount & note
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [cashConfirmed, setCashConfirmed] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptTxn, setReceiptTxn] = useState<Transaction | null>(null);

  // Auto-verify if account param is passed from accounts list
  useEffect(() => {
    if (searchParams.account && searchParams.account.trim()) {
      const clean = searchParams.account.trim().toUpperCase();
      setAccountNumber(clean);
      setLookingUp(true);
      lookupRecipient(clean).then((res) => {
        setLookingUp(false);
        if (res.errorMessage || !res.info) {
          setLookupError(res.errorMessage ?? 'Account not found.');
        } else {
          setRecipient(res.info);
        }
      });
    }
  }, [searchParams.account]);

  useEffect(() => {
    let cancelled = false;
    listActiveBranches().then((res) => {
      if (cancelled) return;
      setLoadingBranches(false);
      setBranches(res.branches);
      if (res.branches.length > 0) {
        setSelectedBranchId(res.branches[0].id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleVerifyAccount() {
    const clean = accountNumber.trim().toUpperCase();
    if (!clean) {
      setLookupError('Please enter an account number.');
      setRecipient(null);
      return;
    }

    setLookingUp(true);
    setLookupError(null);
    setRecipient(null);

    const res = await lookupRecipient(clean);
    setLookingUp(false);

    if (res.errorMessage || !res.info) {
      setLookupError(res.errorMessage ?? 'Account not found.');
    } else {
      setRecipient(res.info);
    }
  }

  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId) ?? null;
  }, [branches, selectedBranchId]);

  const parsedAmount = useMemo(() => {
    return isValidBankingAmount(amountStr, 1_000_000_000);
  }, [amountStr]);

  const canSubmit = useMemo(() => {
    return (
      recipient !== null &&
      recipient.eligible !== false &&
      recipient.status === 'active' &&
      selectedBranchId !== '' &&
      parsedAmount.ok &&
      (parsedAmount.value ?? 0) > 0 &&
      cashConfirmed &&
      !submitting
    );
  }, [recipient, selectedBranchId, parsedAmount, cashConfirmed, submitting]);

  async function handleExecuteDeposit() {
    if (!canSubmit || !parsedAmount.value) return;

    setSubmitting(true);
    setSubmitError(null);

    const idempotencyKey = `dep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const res = await recordBranchDeposit({
      accountNumber: accountNumber.trim().toUpperCase(),
      branchId: selectedBranchId,
      amount: parsedAmount.value,
      note: note.trim() || 'Over-the-counter cash deposit',
      idempotencyKey,
    });

    setSubmitting(false);

    if (res.errorMessage || !res.transaction) {
      setSubmitError(res.errorMessage ?? 'Failed to process deposit.');
    } else {
      setReceiptTxn(res.transaction);
    }
  }

  function handleResetForm() {
    setReceiptTxn(null);
    setAccountNumber('');
    setRecipient(null);
    setLookupError(null);
    setAmountStr('');
    setNote('');
    setCashConfirmed(false);
    setSubmitError(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Branch Cash Deposit"
        subtitle="Staff Operator Counter (FR-DEP-01..08)"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Compliance Warning Card */}
        <Card variant="surface" style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerIcon}>
              <Icon name="bank" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.bannerTitle}>Educational Simulation Counter</Text>
              <Text style={styles.bannerText}>
                Records counter deposits into customer accounts. Ensure valid Bangladesh Bank currency banknotes have been physically verified.
              </Text>
            </View>
          </View>
        </Card>

        {/* Step 1: Target Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Target Account Lookup</Text>
          <View style={styles.lookupRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={accountNumber}
                onChangeText={(t) => {
                  setAccountNumber(t.toUpperCase());
                  setRecipient(null);
                  setLookupError(null);
                }}
                placeholder="e.g. SB-DHK-4821"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!submitting}
                containerStyle={{ marginBottom: 0 }}
                leftIcon="card"
              />
            </View>
            <Button
              title="Verify"
              onPress={handleVerifyAccount}
              loading={lookingUp}
              disabled={lookingUp || submitting || !accountNumber.trim()}
              size="md"
            />
          </View>

          {lookupError ? <Text style={styles.errorText}>{lookupError}</Text> : null}

          {recipient ? (
            <Card variant="surface" style={styles.recipientCard}>
              <View style={styles.recipientHead}>
                <Text style={styles.recipientName}>{recipient.abbreviated_name}</Text>
                <Badge
                  label={recipient.eligible ? 'ACTIVE ACCOUNT' : 'INELIGIBLE'}
                  variant={recipient.eligible ? 'success' : 'error'}
                />
              </View>
              <Text style={styles.recipientAcc}>
                Account: {recipient.masked_account_number} ({recipient.account_type.toUpperCase()})
              </Text>
              <Text style={styles.recipientBranch}>
                Home Branch: {recipient.branch_name} ({recipient.district})
              </Text>
            </Card>
          ) : null}
        </View>

        {/* Step 2: Receiving Branch */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Operating Branch Location</Text>
          {loadingBranches ? (
            <LoadingState label="Loading branch network…" />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select receiving branch"
              onPress={() => setShowBranchPicker(true)}
              style={({ pressed }) => [styles.pickerBtn, pressed && styles.pressed]}
            >
              <View style={{ gap: 2 }}>
                <Text style={styles.pickerLabel}>Teller Branch</Text>
                <Text style={styles.pickerVal}>
                  {selectedBranch
                    ? `${selectedBranch.name} (${selectedBranch.district})`
                    : 'Select branch…'}
                </Text>
              </View>
              <Icon name="chevron-down" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Step 3: Cash Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Cash Amount</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencyPrefix}>৳</Text>
            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!submitting}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
          </View>

          {!parsedAmount.ok && amountStr.trim().length > 0 ? (
            <Text style={styles.errorText}>{parsedAmount.message}</Text>
          ) : null}

          <View style={styles.presetsRow}>
            {PRESET_AMOUNTS.map((amt) => (
              <Pressable
                key={amt}
                accessibilityRole="button"
                accessibilityLabel={`Preset ${amt} Taka`}
                onPress={() => setAmountStr(amt.toString())}
                style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
              >
                <Text style={styles.presetChipText}>{formatBDT(amt)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: spacing.md }}>
            <TextInput
              label="Reference Note (Optional)"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Counter cash deposit by customer"
              editable={!submitting}
            />
          </View>
        </View>

        {/* Step 4: Cash Confirmation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Operator Verification</Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: cashConfirmed }}
            accessibilityLabel="Confirm physical cash received"
            onPress={() => setCashConfirmed((v) => !v)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkboxBox, cashConfirmed && styles.checkboxBoxChecked]}>
              {cashConfirmed && <Icon name="check" size={14} color={colors.textOnPrimary} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm that physical currency banknotes of{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {parsedAmount.value ? formatBDT(parsedAmount.value) : 'the stated amount'}
              </Text>{' '}
              have been received, counted, and verified at the branch counter.
            </Text>
          </Pressable>
        </View>

        {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

        {/* Submit Button */}
        <Button
          title={submitting ? 'Processing Deposit…' : 'Post Branch Deposit'}
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleExecuteDeposit}
        />
      </ScrollView>

      {/* Branch Selector Modal */}
      <Modal
        visible={showBranchPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBranchPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Select Teller Branch</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setShowBranchPicker(false)}
                style={styles.closeBtn}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {branches.map((b) => (
                <Pressable
                  key={b.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Branch ${b.name}`}
                  onPress={() => {
                    setSelectedBranchId(b.id);
                    setShowBranchPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.branchItem,
                    b.id === selectedBranchId && styles.branchItemActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.branchItemName}>{b.name}</Text>
                  <Text style={styles.branchItemMeta}>
                    📍 {b.district} • Code: {b.branch_code}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Receipt Modal */}
      <Modal
        visible={!!receiptTxn}
        transparent
        animationType="slide"
        onRequestClose={handleResetForm}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.receiptModalCard}>
            <View style={styles.receiptSuccessIcon}>
              <Icon name="check" size={32} color={colors.primary} />
            </View>
            <Text style={styles.receiptTitle}>Deposit Successful!</Text>
            <Text style={styles.receiptSubtitle}>
              Funds have been atomically credited to the target customer account.
            </Text>

            <View style={styles.receiptAmountBox}>
              <Text style={styles.receiptAmountLabel}>Credited Amount</Text>
              <Text style={styles.receiptAmountVal}>
                {receiptTxn ? formatBDT(receiptTxn.amount) : ''}
              </Text>
            </View>

            <Card variant="surface" style={styles.receiptMetaCard}>
              <ReceiptRow label="Transaction Reference" value={receiptTxn?.reference ?? receiptTxn?.id ?? '—'} mono />
              <View style={styles.receiptDivider} />
              <ReceiptRow label="Target Recipient" value={recipient?.abbreviated_name ?? '—'} />
              <View style={styles.receiptDivider} />
              <ReceiptRow label="Target Account" value={recipient?.masked_account_number ?? accountNumber} mono />
              <View style={styles.receiptDivider} />
              <ReceiptRow label="Operating Branch" value={selectedBranch ? `${selectedBranch.name} (${selectedBranch.district})` : '—'} />
              <View style={styles.receiptDivider} />
              <ReceiptRow label="Date & Time" value={receiptTxn ? formatDateTime(receiptTxn.created_at) : ''} />
              <View style={styles.receiptDivider} />
              <ReceiptRow label="Status" value="COMPLETED (SETTLED)" />
            </Card>

            <Button
              title="Done (New Deposit)"
              variant="primary"
              size="lg"
              onPress={handleResetForm}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={[styles.receiptValue, mono && styles.receiptMono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  bannerCard: {
    padding: spacing.base,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  bannerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lookupRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.caption.size,
    marginTop: spacing.xs,
  },
  recipientCard: {
    padding: spacing.base,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  recipientHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recipientAcc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  recipientBranch: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  pickerLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pickerVal: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    color: colors.error,
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 43, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.lg,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchItemActive: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  branchItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  branchItemMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  receiptModalCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.lg,
  },
  receiptSuccessIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  receiptSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  receiptAmountBox: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  receiptAmountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  receiptAmountVal: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  receiptMetaCard: {
    width: '100%',
    padding: spacing.base,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  receiptLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  receiptMono: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
