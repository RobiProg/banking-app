import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { appWithdraw, generateIdempotencyKey } from '../../services/transactions';
import { isValidBankingAmount, formatBDT } from '../../utils/format';
import { parseAmount, type Transaction } from '../../types/db';

/**
 * Simulated Customer Withdrawal Screen (SRS v2.1 FR-WD-01..06, TC-16, TC-17).
 * Explicitly states that simulated withdrawals do not dispense physical cash.
 */
export default function WithdrawScreen() {
  const router = useRouter();
  const { account, loading, errorMessage, reload } = useAccount();

  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
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
        <ScreenHeader title="Withdraw" subtitle="Simulated Cash Withdrawal" />
        <View style={styles.body}>
          <ErrorState
            title="Account inactive"
            message="Your account is not active, so you cannot withdraw funds right now."
          />
        </View>
      </SafeAreaView>
    );
  }

  const balanceNum = parseAmount(account.balance);
  const validation = isValidBankingAmount(amount);
  const amountNum = validation.value ?? 0;
  const overBalance = validation.ok && amountNum > balanceNum;
  const resultingBalance = balanceNum - amountNum;

  function handleOpenConfirm() {
    if (!validation.ok || overBalance) return;
    setIdempotencyKey(generateIdempotencyKey());
    setShowConfirm(true);
  }

  async function handleConfirmWithdrawal() {
    if (!validation.ok || overBalance) return;
    setError(null);
    setSubmitting(true);

    const res = await appWithdraw({
      amount: amountNum,
      idempotencyKey: idempotencyKey,
    });

    setSubmitting(false);

    if (res.errorMessage) {
      setError(res.errorMessage);
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
        <ScreenHeader title="Withdrawal Receipt" />
        <ScrollView contentContainerStyle={styles.receiptScroll}>
          <View style={styles.receiptCard}>
            <View style={styles.successIconPlate}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.receiptTitle}>Withdrawal Recorded</Text>
            <Money value={completedTxn.amount} size="xl" color={colors.text} />

            <View style={styles.receiptDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Reference</Text>
                <Text style={styles.receiptValue}>{completedTxn.reference}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Account</Text>
                <Text style={styles.receiptValue}>{account.account_number}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>New Balance</Text>
                <Text style={styles.receiptValue}>{formatBDT(resultingBalance)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status</Text>
                <Text style={[styles.receiptValue, { color: colors.success }]}>Completed</Text>
              </View>
            </View>

            <View style={styles.noCashNotice}>
              <Text style={styles.noCashText}>
                Notice: Simulated demonstration only. No physical cash is dispensed (FR-WD-05).
              </Text>
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
        title="Withdraw"
        subtitle="Simulated Cash Withdrawal"
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Physical Cash Disclaimer (FR-WD-05) */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>⚠️</Text>
          <Text style={styles.bannerText}>
            Simulated demonstration only: This app does not dispense physical currency or connect to physical ATMs.
          </Text>
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Money value={account.balance} size="large" />
          <Text style={styles.accountNumberText}>{account.account_number}</Text>
        </Card>

        {error && <FormErrorBanner message={error} />}

        <Card style={styles.formCard}>
          <AuthInput
            label="Amount to withdraw (৳)"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              setError(null);
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={
              !validation.ok && amount.length > 0
                ? validation.message
                : overBalance
                ? 'Amount exceeds your available balance'
                : null
            }
          />

          {validation.ok && !overBalance && (
            <View style={styles.resultingBox}>
              <Text style={styles.resultingLabel}>Resulting Balance:</Text>
              <Text style={styles.resultingValue}>{formatBDT(resultingBalance)}</Text>
            </View>
          )}

          <AuthButton
            title="Withdraw"
            onPress={handleOpenConfirm}
            disabled={!validation.ok || overBalance}
          />
        </Card>
      </ScrollView>

      {/* Confirmation Dialog (FR-WD-02) */}
      <ConfirmDialog
        visible={showConfirm}
        title="Confirm Simulated Withdrawal"
        message={`Debit ${formatBDT(amountNum)} from account ${account.account_number}? Resulting balance will be ${formatBDT(resultingBalance)}.`}
        confirmLabel="Confirm Withdrawal"
        loading={submitting}
        onConfirm={handleConfirmWithdrawal}
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
  banner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerIcon: {
    fontSize: 20,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: '#8D6E63',
    lineHeight: 18,
    fontWeight: '500',
  },
  balanceCard: {
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  balanceLabel: {
    fontSize: typography.caption.size,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  accountNumberText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formCard: {
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: 14,
  },
  resultingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.sm + 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultingLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  resultingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
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
  noCashNotice: {
    backgroundColor: '#FFF8E1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: spacing.xs,
  },
  noCashText: {
    fontSize: 11,
    color: '#8D6E63',
    fontWeight: '600',
    textAlign: 'center',
  },
});