import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Card } from '../../components/common/Card';
import { Money } from '../../components/common/Money';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../hooks/useAccount';
import { lookupRecipient } from '../../services/accounts';
import { appTransfer, generateIdempotencyKey } from '../../services/transactions';
import { formatBDT, isValidBankingAmount } from '../../utils/format';
import { parseAmount, type RecipientLookupInfo, type Transaction } from '../../types/db';

type Step = 1 | 2 | 3;

/**
 * Send Money Screen (SRS v2.1 FR-TRF-01..13, design.md §5.1 / §6.4).
 * Multi-step flow:
 *   1. Recipient account number -> Lookup returns abbreviated name, masked account, branch.
 *   2. Amount (strict 2 decimal places, max limit, remaining balance) + optional note.
 *   3. Confirmation sheet with zero transfer fee notice and UUID idempotency key.
 *   4. Success receipt modal with unique reference.
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
      setRecipientError("You cannot transfer to your own account (FR-TRF-09).");
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
    // Generate UUID idempotency key once upon opening confirmation sheet (design.md §6.4)
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

  // --- Success Modal / Screen ---
  if (completedTxn) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Transfer Receipt" />
        <ScrollView contentContainerStyle={styles.receiptScroll}>
          <View style={styles.receiptCard}>
            <View style={styles.successIconPlate}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.receiptTitle}>Transfer Successful</Text>
            <Money value={completedTxn.amount} size="xl" color={colors.success} />

            <View style={styles.receiptDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Reference</Text>
                <Text style={styles.receiptValue}>{completedTxn.reference}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Recipient</Text>
                <Text style={styles.receiptValue}>{recipientInfo?.abbreviated_name}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Account</Text>
                <Text style={styles.receiptValue}>{recipientInfo?.masked_account_number}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Recipient Branch</Text>
                <Text style={styles.receiptValue}>{recipientInfo?.branch_name}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Transfer Fee</Text>
                <Text style={styles.receiptValue}>৳0.00 (Zero Fee)</Text>
              </View>
              {completedTxn.description && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Note</Text>
                  <Text style={styles.receiptValue}>{completedTxn.description}</Text>
                </View>
              )}
            </View>

            <View style={styles.educationalBadge}>
              <Text style={styles.educationalText}>Educational Simulation • No real funds moved</Text>
            </View>
          </View>

          <AuthButton
            title="Done"
            onPress={() => router.replace(ROUTES.customer)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Send money"
        subtitle={`Step ${step} of 2 • SmartBank Internal Transfer`}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Source Account Info */}
        <Card style={styles.sourceCard}>
          <Text style={styles.sourceLabel}>From Account</Text>
          <View style={styles.sourceRow}>
            <View>
              <Text style={styles.sourceNumber}>{account.account_number}</Text>
              <Text style={styles.sourceBranch}>
                {account.branch ? `${account.branch.name} (${account.branch.district})` : 'Dhaka Motijheel Main'}
              </Text>
            </View>
            <View style={styles.balanceRight}>
              <Text style={styles.balanceCaption}>Available</Text>
              <Money value={account.balance} size="small" />
            </View>
          </View>
        </Card>

        {transferError && <FormErrorBanner message={transferError} />}

        {/* STEP 1: Recipient Input */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Enter Recipient Account</Text>
            <Text style={styles.stepSubtitle}>
              SmartBank will look up the branch and verify the recipient automatically.
            </Text>

            <AuthInput
              label="Recipient Account Number"
              placeholder="e.g. AC1000000002"
              value={recipientNumber}
              onChangeText={(t) => {
                setRecipientNumber(t);
                setRecipientError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              error={recipientError}
              editable={!recipientChecking}
            />

            <AuthButton
              title="Verify Recipient"
              onPress={handleValidateRecipient}
              loading={recipientChecking}
              disabled={!recipientNumber.trim()}
            />
          </View>
        )}

        {/* STEP 2: Amount & Details */}
        {step === 2 && recipientInfo && (
          <View style={styles.stepContainer}>
            {/* Verified Recipient Preview Card (FR-TRF-02, TC-21) */}
            <Card style={styles.recipientCard}>
              <View style={styles.recipientHeader}>
                <View style={styles.verifiedIconPlate}>
                  <Text style={styles.verifiedIcon}>✓</Text>
                </View>
                <View style={styles.recipientMeta}>
                  <Text style={styles.recipientName}>{recipientInfo.abbreviated_name}</Text>
                  <Text style={styles.recipientNumber}>{recipientInfo.masked_account_number}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setStep(1);
                    setRecipientInfo(null);
                  }}
                  style={styles.changeBtn}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </Pressable>
              </View>

              <View style={styles.branchRow}>
                <Text style={styles.branchLabel}>Branch:</Text>
                <Text style={styles.branchValue}>
                  {recipientInfo.branch_name} ({recipientInfo.district})
                </Text>
              </View>
            </Card>

            <View style={styles.inputGap}>
              <AuthInput
                label="Amount (৳)"
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                error={
                  !amountValidation.ok && amount.length > 0
                    ? amountValidation.message
                    : isOverBalance
                    ? 'Amount exceeds available balance'
                    : null
                }
              />
            </View>

            {amountValidation.ok && !isOverBalance && (
              <View style={styles.remainingBox}>
                <Text style={styles.remainingText}>
                  Remaining Balance: <Text style={styles.remainingBold}>{formatBDT(remainingBalance)}</Text>
                </Text>
                <Text style={styles.feeNotice}>Transfer Fee: ৳0.00 (Zero Fee)</Text>
              </View>
            )}

            <View style={styles.inputGap}>
              <AuthInput
                label="Note / Reference (Optional)"
                placeholder="e.g. Dinner share, Project payment"
                value={note}
                onChangeText={setNote}
                maxLength={60}
              />
            </View>

            <AuthButton
              title="Review Transfer"
              onPress={handleOpenConfirm}
              disabled={!amountValidation.ok || isOverBalance}
            />
          </View>
        )}
      </ScrollView>

      {/* Confirmation Dialog (FR-TRF-04) */}
      <ConfirmDialog
        visible={showConfirm}
        title="Confirm Transfer"
        message={`Are you sure you want to send ${formatBDT(amountNum)} to ${recipientInfo?.abbreviated_name} (${recipientInfo?.masked_account_number}) at ${recipientInfo?.branch_name}?`}
        confirmLabel="Send Money"
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
    padding: spacing.md,
    gap: spacing.md,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  sourceCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceNumber: {
    fontSize: typography.body.size,
    fontWeight: '700',
    color: colors.text,
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
    gap: spacing.md,
  },
  stepTitle: {
    fontSize: typography.title.size,
    fontWeight: '700',
    color: colors.text,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: -8,
  },
  recipientCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  verifiedIconPlate: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.successLight ?? '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  verifiedIcon: {
    color: colors.success,
    fontWeight: '700',
  },
  recipientMeta: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  recipientNumber: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  branchLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 6,
  },
  branchValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  inputGap: {
    marginTop: spacing.xs,
  },
  remainingBox: {
    backgroundColor: colors.primaryLight,
    padding: spacing.sm + 2,
    borderRadius: 10,
    marginTop: -spacing.xs,
  },
  remainingText: {
    fontSize: 13,
    color: colors.primaryDark,
  },
  remainingBold: {
    fontWeight: '700',
  },
  feeNotice: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 2,
    opacity: 0.85,
  },
  receiptScroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  receiptCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.md,
  },
  successIconPlate: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successLight ?? '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    fontSize: 28,
    color: colors.success,
    fontWeight: '700',
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  receiptDetails: {
    width: '100%',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  educationalBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  educationalText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});