import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { lookupRecipient } from '../../services/accounts';
import { listActiveBranches } from '../../services/branches';
import { recordBranchDeposit } from '../../services/admin';
import type { Branch, RecipientLookupInfo, Transaction } from '../../types/db';
import { formatBDT, formatDateTime, isValidBankingAmount } from '../../utils/format';

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

/**
 * Staff Simulated Branch Deposit Screen (SRS v2.1 FR-DEP-01..08, TC-11, TC-12).
 * Allows authorized bank staff (teller/admin) to record a simulated physical
 * cash deposit at the counter into any active customer bank account.
 */
export default function AdminBranchDepositScreen() {
  const router = useRouter();

  // Branch list
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  // Recipient lookup
  const [accountNumber, setAccountNumber] = useState('');
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
    return isValidBankingAmount(amountStr);
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

    // Client idempotency key
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

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Compliance Warning */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>💵 Educational Simulation Counter</Text>
          <Text style={styles.bannerText}>
            This portal records physical counter deposits into customer accounts. Ensure valid Bangladesh Bank currency banknotes have been physically inspected before posting.
          </Text>
        </View>

        {/* Step 1: Target Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Target Account Lookup</Text>
          <View style={styles.lookupRow}>
            <TextInput
              style={styles.lookupInput}
              value={accountNumber}
              onChangeText={(t) => {
                setAccountNumber(t.toUpperCase());
                setRecipient(null);
                setLookupError(null);
              }}
              placeholder="e.g. SB-DHK-4821"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!submitting}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Verify account"
              disabled={lookingUp || submitting || !accountNumber.trim()}
              onPress={handleVerifyAccount}
              style={({ pressed }) => [
                styles.verifyBtn,
                pressed && styles.pressed,
                (lookingUp || !accountNumber.trim()) && styles.disabled,
              ]}
            >
              <Text style={styles.verifyBtnText}>
                {lookingUp ? 'Verifying…' : 'Verify'}
              </Text>
            </Pressable>
          </View>

          {lookupError ? <Text style={styles.errorText}>{lookupError}</Text> : null}

          {recipient ? (
            <View style={styles.recipientCard}>
              <View style={styles.recipientHead}>
                <Text style={styles.recipientName}>{recipient.abbreviated_name}</Text>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>
                    {recipient.eligible ? 'ACTIVE ACCOUNT' : 'INELIGIBLE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.recipientAcc}>
                Account: {recipient.masked_account_number} ({recipient.account_type.toUpperCase()})
              </Text>
              <Text style={styles.recipientBranch}>
                📍 Home Branch: {recipient.branch_name} ({recipient.district})
              </Text>
            </View>
          ) : null}
        </View>

        {/* Step 2: Receiving Branch */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Receiving Branch Location</Text>
          {loadingBranches ? (
            <LoadingState label="Loading branch network…" />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select receiving branch"
              onPress={() => setShowBranchPicker(true)}
              style={({ pressed }) => [styles.pickerBtn, pressed && styles.pressed]}
            >
              <View>
                <Text style={styles.pickerLabel}>Teller Branch</Text>
                <Text style={styles.pickerVal}>
                  {selectedBranch
                    ? `${selectedBranch.name} (${selectedBranch.district})`
                    : 'Select branch…'}
                </Text>
              </View>
              <Text style={styles.pickerArrow}>▼</Text>
            </Pressable>
          )}
        </View>

        {/* Step 3: Cash Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Cash Amount</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencyPrefix}>৳</Text>
            <TextInput
              style={styles.amountInput}
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              editable={!submitting}
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

          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Reference Note (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Counter cash deposit by customer"
            placeholderTextColor={colors.textMuted}
            editable={!submitting}
          />
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
              {cashConfirmed ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm that physical currency banknotes of{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {parsedAmount.value ? formatBDT(parsedAmount.value) : 'the stated amount'}
              </Text>{' '}
              have been received, counted, and verified at the branch counter.
            </Text>
          </Pressable>
        </View>

        {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

        {/* Submit Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Post branch deposit"
          disabled={!canSubmit}
          onPress={handleExecuteDeposit}
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && styles.pressed,
            !canSubmit && styles.disabled,
          ]}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Processing Deposit…' : 'Post Branch Deposit'}
          </Text>
        </Pressable>
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
                <Text style={styles.closeText}>✕</Text>
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
          <View style={styles.receiptCard}>
            <View style={styles.receiptSuccessIcon}>
              <Text style={styles.receiptCheckText}>✓</Text>
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

            <View style={styles.receiptMetaWrap}>
              <ReceiptRow label="Transaction Reference" value={receiptTxn?.reference ?? receiptTxn?.id ?? '—'} mono />
              <ReceiptRow label="Target Recipient" value={recipient?.abbreviated_name ?? '—'} />
              <ReceiptRow label="Target Account" value={recipient?.masked_account_number ?? accountNumber} mono />
              <ReceiptRow label="Operating Branch" value={selectedBranch ? `${selectedBranch.name} (${selectedBranch.district})` : '—'} />
              <ReceiptRow label="Date & Time" value={receiptTxn ? formatDateTime(receiptTxn.created_at) : ''} />
              <ReceiptRow label="Status" value="COMPLETED (SETTLED)" />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={handleResetForm}
              style={({ pressed }) => [styles.receiptDoneBtn, pressed && styles.pressed]}
            >
              <Text style={styles.receiptDoneText}>Done (New Deposit)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptRowLabel}>{label}</Text>
      <Text style={[styles.receiptRowVal, mono && styles.monoText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.lg },
  banner: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, marginBottom: 2 },
  bannerText: { fontSize: typography.caption.size, color: colors.textMuted, lineHeight: 18 },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  lookupRow: { flexDirection: 'row', gap: spacing.sm },
  lookupInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.size,
    color: colors.text,
    backgroundColor: colors.background,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  errorText: { color: colors.error, fontSize: typography.caption.size, marginTop: spacing.xs },
  recipientCard: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recipientName: { fontSize: 16, fontWeight: '700', color: colors.text },
  activePill: { backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  activePillText: { fontSize: 10, fontWeight: '700', color: colors.success },
  recipientAcc: { fontSize: typography.body.size, color: colors.textMuted, marginTop: 4 },
  recipientBranch: { fontSize: typography.caption.size, color: colors.primary, marginTop: 2, fontWeight: '600' },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  pickerLabel: { fontSize: 11, color: colors.textMuted },
  pickerVal: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  pickerArrow: { fontSize: 12, color: colors.textMuted },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
  },
  currencyPrefix: { fontSize: 24, fontWeight: '700', color: colors.text, marginRight: spacing.xs },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: spacing.sm },
  presetChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipText: { fontSize: typography.caption.size, fontWeight: '600', color: colors.text },
  inputLabel: { fontSize: typography.label.size, fontWeight: '600', color: colors.text, marginBottom: 4 },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.size,
    color: colors.text,
    backgroundColor: colors.background,
  },
  checkboxRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.textOnPrimary, fontSize: 14, fontWeight: '800' },
  checkboxLabel: { flex: 1, fontSize: typography.caption.size, color: colors.textMuted, lineHeight: 18 },
  errorBanner: {
    color: colors.error,
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: 8,
    fontSize: typography.body.size,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { padding: spacing.xs },
  closeText: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  branchItem: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  branchItemActive: { backgroundColor: colors.primaryLight },
  branchItemName: { fontSize: 15, fontWeight: '700', color: colors.text },
  branchItemMeta: { fontSize: typography.caption.size, color: colors.textMuted, marginTop: 2 },

  receiptCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  receiptSuccessIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  receiptCheckText: { color: colors.success, fontSize: 32, fontWeight: '800' },
  receiptTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  receiptSubtitle: {
    fontSize: typography.caption.size,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  receiptAmountBox: {
    backgroundColor: colors.surface,
    width: '100%',
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  receiptAmountLabel: { fontSize: typography.caption.size, color: colors.textMuted },
  receiptAmountVal: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 2 },
  receiptMetaWrap: { width: '100%', marginBottom: spacing.lg },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  receiptRowLabel: { fontSize: typography.caption.size, color: colors.textMuted },
  receiptRowVal: { fontSize: typography.caption.size, fontWeight: '700', color: colors.text },
  monoText: { fontFamily: 'monospace' },
  receiptDoneBtn: {
    backgroundColor: colors.primary,
    width: '100%',
    borderRadius: 10,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  receiptDoneText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '700' },
});
