import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { TextInput } from '../../components/ui/TextInput';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { ToggleableBalance } from '../../components/common/ToggleableBalance';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../hooks/useAccount';
import { lookupRecipient } from '../../services/accounts';
import { appTransfer, generateIdempotencyKey } from '../../services/transactions';
import { formatBDT, isValidBankingAmount } from '../../utils/format';
import { parseAmount, type RecipientLookupInfo, type Transaction } from '../../types/db';

type Step = 1 | 2;

/**
 * Send / Transfer Money Flow. Matches Figma §12 & §13.
 * 3-step visual stepper: Recipient -> Amount -> Review -> Success Receipt.
 * Preserves Supabase atomic RPC transfer and idempotency.
 */
export default function SendMoneyScreen() {
  const router = useRouter();
  const { account, loading, errorMessage, reload } = useAccount();

  const [step, setStep] = useState<Step>(1);
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<RecipientLookupInfo | null>(null);
  const [recipientChecking, setRecipientChecking] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);

  if (loading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading your account…" />
      </ScreenContainer>
    );
  }

  if (errorMessage || !account) {
    return (
      <ScreenContainer scrollable={false} centered>
        <ErrorState
          title="Account unavailable"
          message={errorMessage ?? 'Account not found.'}
          onRetry={reload}
        />
      </ScreenContainer>
    );
  }

  if (account.status !== 'active') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Send money" subtitle="Transfer to another account" />
        <View style={styles.body}>
          <ErrorState
            title="Account inactive"
            message="Your account is not active, so you cannot send money right now."
          />
        </View>
      </SafeAreaView>
    );
  }

  // --- Step 1: Validate Recipient ---
  async function handleValidateRecipient() {
    const trimmed = recipientNumber.trim().toUpperCase();
    if (!trimmed) {
      setRecipientError('Please enter an account number.');
      return;
    }

    if (trimmed === account?.account_number) {
      setRecipientError('You cannot transfer to your own account (FR-TRF-09).');
      return;
    }

    setRecipientChecking(true);
    setRecipientError(null);
    setRecipientInfo(null);

    const res = await lookupRecipient(trimmed);
    setRecipientChecking(false);

    if (res.errorMessage) {
      setRecipientError(res.errorMessage);
      return;
    }

    if (!res.info) {
      setRecipientError('No SmartBank account found for that number.');
      return;
    }

    if (res.info.eligible === false || res.info.status !== 'active') {
      setRecipientError('Recipient account is not active or ineligible to receive funds.');
      return;
    }

    setRecipientInfo(res.info);
    setStep(2);
  }

  // --- Step 2: Validate Amount ---
  const balanceNum = parseAmount(account.balance);
  const amountValidation = isValidBankingAmount(amount);
  const amountNum = amountValidation.value ?? 0;
  const isOverBalance = amountValidation.ok && amountNum > balanceNum;
  const remainingBalance = balanceNum - amountNum;

  function handleOpenConfirm() {
    if (!amountValidation.ok || isOverBalance) return;
    setIdempotencyKey(generateIdempotencyKey());
    setShowConfirm(true);
  }

  // --- Step 3: Execute Transfer ---
  async function handleConfirmTransfer() {
    if (!amountValidation.ok || isOverBalance || !recipientInfo) return;
    setSubmitting(true);
    setTransferError(null);

    const res = await appTransfer({
      recipientAccountNumber: recipientInfo.account_number,
      amount: amountNum,
      description: note.trim() || null,
      idempotencyKey: idempotencyKey,
    });

    setSubmitting(false);

    if (res.errorMessage) {
      setTransferError(res.errorMessage);
      setShowConfirm(false);
      return;
    }

    setShowConfirm(false);
    setCompletedTxn(res.transaction);
  }

  // --- Success Modal / Screen (§13) ---
  if (completedTxn) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.receiptScroll} showsVerticalScrollIndicator={false}>
          {/* Success Hero (§13) */}
          <View style={styles.successHero}>
            <View style={styles.successCircle}>
              <Icon name="check" size={36} color={colors.primary} />
            </View>
            <Text style={styles.successTitle}>Transfer complete</Text>
            <Text style={styles.successAmount}>{formatBDT(completedTxn.amount)}</Text>
            <Text style={styles.successRecipient}>
              to {recipientInfo?.abbreviated_name}
            </Text>
          </View>

          {/* Receipt Breakdown Card */}
          <Card variant="surface" style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Reference ID</Text>
              <Text style={styles.receiptValue}>{completedTxn.reference}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Recipient account</Text>
              <Text style={styles.receiptValue}>{recipientInfo?.masked_account_number}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Recipient branch</Text>
              <Text style={styles.receiptValue}>{recipientInfo?.branch_name}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Transfer fee</Text>
              <Text style={styles.receiptValueFree}>৳0.00 (Zero Fee)</Text>
            </View>
            {completedTxn.description && (
              <>
                <View style={styles.rowDivider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Note</Text>
                  <Text style={styles.receiptValue}>{completedTxn.description}</Text>
                </View>
              </>
            )}
          </Card>

          <View style={styles.simulatedNote}>
            <Icon name="info" size={14} color={colors.textSecondary} />
            <Text style={styles.simulatedText}>
              Educational Simulation • Atomic ledger transaction verified
            </Text>
          </View>

          {/* Bottom Actions (§13) */}
          <View style={styles.receiptActions}>
            <Button
              title="Share receipt"
              variant="outline"
              icon="copy"
              onPress={() =>
                Alert.alert('Share Receipt', `Reference: ${completedTxn.reference}\nAmount: ${formatBDT(completedTxn.amount)}`, [{ text: 'OK' }])
              }
              style={styles.actionButton}
            />
            <Button
              title="Done"
              variant="primary"
              onPress={() => router.replace(ROUTES.customer)}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Send money"
        subtitle={`Step ${step} of 2 • SmartBank P2P Transfer`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Source Account Info Card */}
        <Card variant="surface" style={styles.sourceCard}>
          <Text style={styles.sourceLabel}>From account</Text>
          <View style={styles.sourceRow}>
            <View>
              <Text style={styles.sourceNumber}>{account.account_number}</Text>
              <Text style={styles.sourceBranch}>
                {account.branch ? `${account.branch.name} (${account.branch.district})` : 'Assigned branch'}
              </Text>
            </View>
            <View style={styles.balanceRight}>
              <Text style={styles.balanceCaption}>Available</Text>
              <ToggleableBalance
                value={account.balance}
                size="small"
                iconSize={15}
                buttonSize={26}
              />
            </View>
          </View>
        </Card>

        {transferError && <FormErrorBanner message={transferError} />}

        {/* STEP 1: Recipient Input */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Choose recipient</Text>
              <Text style={styles.stepSubtitle}>
                Enter the 10-digit SmartBank account number to send funds instantly.
              </Text>
            </View>

            <TextInput
              label="Recipient account number"
              placeholder="e.g. 1000000002"
              value={recipientNumber}
              onChangeText={(t) => {
                setRecipientNumber(t);
                setRecipientError(null);
              }}
              leftIcon="user"
              keyboardType="number-pad"
              maxLength={12}
              error={recipientError}
              autoFocus
            />

            <Button
              title="Verify recipient"
              onPress={handleValidateRecipient}
              loading={recipientChecking}
              disabled={!recipientNumber.trim()}
              size="lg"
            />
          </View>
        )}

        {/* STEP 2: Amount & Note Input */}
        {step === 2 && recipientInfo && (
          <View style={styles.stepContainer}>
            {/* Selected Recipient Card Chip (§12) */}
            <Card variant="default" style={styles.recipientChip}>
              <View style={styles.chipRow}>
                <View style={styles.chipLeft}>
                  <View style={styles.verifiedIconPlate}>
                    <Icon name="check" size={16} color={colors.success} />
                  </View>
                  <View style={styles.recipientTexts}>
                    <Text style={styles.recipientName}>{recipientInfo.abbreviated_name}</Text>
                    <Text style={styles.recipientMeta}>
                      {recipientInfo.masked_account_number} • {recipientInfo.branch_name}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change recipient"
                  onPress={() => {
                    setStep(1);
                    setRecipientInfo(null);
                  }}
                  hitSlop={8}
                  style={styles.changeBtn}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </Pressable>
              </View>
            </Card>

            {/* Amount Input */}
            <TextInput
              label="Transfer amount (৳)"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              leftIcon="bank"
              error={
                !amountValidation.ok && amount.length > 0
                  ? amountValidation.message
                  : isOverBalance
                  ? 'Amount exceeds available balance'
                  : null
              }
              autoFocus
            />

            {/* Balance Preview */}
            {amountValidation.ok && !isOverBalance && (
              <View style={styles.previewBox}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Remaining balance:</Text>
                  <Text style={styles.previewValue}>{formatBDT(remainingBalance)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Transfer fee:</Text>
                  <Text style={styles.freeText}>৳0.00 (Zero Fee)</Text>
                </View>
              </View>
            )}

            <TextInput
              label="Note / Reference (Optional)"
              placeholder="What's this for?"
              value={note}
              onChangeText={setNote}
              maxLength={60}
              leftIcon="mail"
            />

            <Button
              title="Review transfer"
              onPress={handleOpenConfirm}
              disabled={!amountValidation.ok || isOverBalance}
              size="lg"
            />
          </View>
        )}
      </ScrollView>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={showConfirm}
        title="Confirm transfer"
        message={`Are you sure you want to send ${formatBDT(amountNum)} to ${recipientInfo?.abbreviated_name} (${recipientInfo?.masked_account_number}) at ${recipientInfo?.branch_name}?`}
        confirmLabel="Authorize & Send"
        loading={submitting}
        onConfirm={handleConfirmTransfer}
        onCancel={() => setShowConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.base,
    gap: spacing.base,
  },
  body: {
    flex: 1,
    padding: spacing.base,
    justifyContent: 'center',
  },
  sourceCard: {
    padding: spacing.base,
  },
  sourceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sourceBranch: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  balanceCaption: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stepContainer: {
    gap: spacing.base,
  },
  stepHeader: {
    marginBottom: spacing.xs,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  recipientChip: {
    padding: spacing.base,
    borderColor: colors.borderFocus,
    backgroundColor: '#F9FBFF',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  verifiedIconPlate: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  recipientTexts: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recipientMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  changeBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  previewBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  freeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  receiptScroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  successHero: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  successRecipient: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  receiptCard: {
    width: '100%',
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.base,
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
  },
  receiptValueFree: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  simulatedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xl,
  },
  simulatedText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
});
