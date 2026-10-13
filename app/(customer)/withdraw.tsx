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
import { useAccount } from '../../hooks/useAccount';
import { withdrawFunds } from '../../services/transactions';
import { isValidAmountInput, formatBDT } from '../../utils/format';
import { parseAmount } from '../../types/db';

/**
 * Withdraw screen (Phase 9).
 * Validates against balance client-side as a UX hint; the server-side
 * `withdraw_funds` RPC re-validates and is the source of truth.
 */
export default function WithdrawScreen() {
  const router = useRouter();
  const { account, loading, errorMessage, reload } = useAccount();
  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading…" />
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
        <ScreenHeader title="Withdraw" subtitle="Take money out of your account" />
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
  const validation = isValidAmountInput(amount);
  const overBalance = validation.ok && (validation.value ?? 0) > balanceNum;
  const showFieldError =
    !validation.ok
      ? validation.message ?? null
      : overBalance
      ? 'Amount exceeds your available balance.'
      : null;

  const canSubmit = validation.ok && !overBalance && !submitting;

  async function handleConfirm() {
    if (!validation.ok || overBalance) return;
    setError(null);
    setSubmitting(true);
    const res = await withdrawFunds(validation.value!);
    setSubmitting(false);
    setShowConfirm(false);
    if (res.errorMessage) {
      setError(res.errorMessage);
      return;
    }
    router.replace({
      pathname: '/(customer)/transaction-details',
      params: { id: res.transaction!.id, just: '1' },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Withdraw"
        subtitle="Take money out of your savings account."
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="surface">
          <Text style={styles.label}>Available balance</Text>
          <Money value={account.balance} size="large" />
        </Card>

        <AuthInput
          label="Amount"
          value={amount}
          onChangeText={(t) => {
            const cleaned = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            setAmount(cleaned);
            setError(null);
          }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          autoCapitalize="none"
          autoCorrect={false}
          error={amount.length > 0 ? showFieldError : null}
          accessibilityHint="Amount in taka to withdraw"
        />

        <Text style={styles.helper}>Maximum: {formatBDT(account.balance)}</Text>

        <FormErrorBanner message={error} />

        <AuthButton
          title="Review withdrawal"
          onPress={() => setShowConfirm(true)}
          disabled={!canSubmit}
        />
      </ScrollView>

      <ConfirmDialog
        visible={showConfirm}
        title="Confirm withdrawal"
        message={`You are about to withdraw ${formatAmount(amount)} from your savings account.`}
        confirmLabel="Confirm withdrawal"
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => (submitting ? null : setShowConfirm(false))}
      />
    </SafeAreaView>
  );
}

function formatAmount(raw: string): string {
  const v = isValidAmountInput(raw);
  return v.ok ? `৳${Number(raw).toFixed(2)}` : '৳0.00';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: spacing.lg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  label: {
    fontSize: typography.label.size,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  helper: {
    fontSize: typography.helper.size,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
});