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
import { depositFunds } from '../../services/transactions';
import { isValidAmountInput } from '../../utils/format';

/**
 * Deposit screen (Phase 8).
 * Amount input → ConfirmDialog → deposit_funds RPC → success screen.
 */
export default function DepositScreen() {
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
        <ScreenHeader title="Deposit" subtitle="Add money to your account" />
        <View style={styles.body}>
          <ErrorState
            title="Account inactive"
            message="Your account is not active, so you cannot deposit funds right now. Please contact support."
          />
        </View>
      </SafeAreaView>
    );
  }

  const validation = isValidAmountInput(amount);
  const canSubmit = validation.ok && !submitting;

  async function handleConfirm() {
    if (!validation.ok) return;
    setError(null);
    setSubmitting(true);
    const res = await depositFunds(validation.value!);
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
        title="Deposit"
        subtitle="Add money to your savings account."
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="surface">
          <Text style={styles.label}>Current balance</Text>
          <Money value={account.balance} size="large" />
        </Card>

        <AuthInput
          label="Amount"
          value={amount}
          onChangeText={(t) => {
            // Allow only digits and a single dot.
            const cleaned = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            setAmount(cleaned);
            setError(null);
          }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          autoCapitalize="none"
          autoCorrect={false}
          error={!validation.ok && amount.length > 0 ? validation.message ?? null : null}
          accessibilityHint="Amount in taka to deposit"
        />

        <FormErrorBanner message={error} />

        <AuthButton
          title="Review deposit"
          onPress={() => setShowConfirm(true)}
          disabled={!canSubmit}
        />
      </ScrollView>

      <ConfirmDialog
        visible={showConfirm}
        title="Confirm deposit"
        message={`You are about to deposit ${formatAmount(amount)} into your savings account.`}
        confirmLabel="Confirm deposit"
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
});