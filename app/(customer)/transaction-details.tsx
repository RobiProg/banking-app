import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { AuthButton } from '../../components/auth/AuthButton';
import { Card } from '../../components/common/Card';
import { Money } from '../../components/common/Money';
import { TransactionTypePill } from '../../components/banking/TransactionTypePill';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { useAccount } from '../../hooks/useAccount';
import { getTransactionById } from '../../services/transactions';
import type { Transaction as TxnModel } from '../../types/db';
import { txnDirection } from '../../types/db';
import { formatDateTime } from '../../utils/format';

/**
 * Transaction detail screen (Phase 11).
 * Reachable via:
 *   - Tap on a transaction row
 *   - Redirect after a successful deposit / withdraw / transfer
 *     (with `just=1` to render a "Done" CTA)
 */
export default function TransactionDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; just?: string }>();
  const id = params.id ?? '';

  const { account } = useAccount();
  const myAccountId = account?.id ?? null;
  const [transaction, setTransaction] = useState<TxnModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const justCompleted = params.just === '1';

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setError('Transaction not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    getTransactionById(id)
      .then((res) => {
        if (cancelled) return;
        if (res.errorMessage) setError(res.errorMessage);
        else setTransaction(res.transaction);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading transaction…" />
      </ScreenContainer>
    );
  }
  if (error || !transaction) {
    return (
      <ScreenContainer scrollable={false} centered>
        <ErrorState
          title="Transaction unavailable"
          message={error ?? 'Transaction not found.'}
          onRetry={() => router.back()}
          retryLabel="Go back"
        />
      </ScreenContainer>
    );
  }

  const direction = txnDirection(transaction, myAccountId);
  const sign = direction === 'credit' ? 'positive' : 'negative';
  const amountColor =
    direction === 'credit' ? colors.success : direction === 'debit' ? colors.error : colors.text;
  const amountPrefix = sign === 'positive' ? '+' : sign === 'negative' ? '−' : '';

  const title =
    transaction.transaction_type === 'deposit'
      ? 'Deposit'
      : transaction.transaction_type === 'withdrawal'
      ? 'Withdrawal'
      : direction === 'credit'
      ? 'Money received'
      : 'Money sent';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={justCompleted ? 'Success' : 'Transaction'}
        subtitle={justCompleted ? 'Your transaction is complete.' : undefined}
        rightLabel={justCompleted ? 'Done' : undefined}
        onPressRight={() => router.replace('/(customer)')}
        onPressBack={
          justCompleted ? () => router.replace('/(customer)') : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroBlock}>
          <View
            style={[
              styles.iconPlate,
              direction === 'credit'
                ? styles.iconCredit
                : direction === 'debit'
                ? styles.iconDebit
                : styles.iconNeutral,
            ]}
          >
            <Text style={[styles.iconMark, { color: amountColor }]}>
              {direction === 'credit' ? '↓' : direction === 'debit' ? '↑' : '·'}
            </Text>
          </View>
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix}
            <Money value={transaction.amount} size="xl" color={amountColor} />
          </Text>
          <Text style={styles.title}>{title}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <TransactionTypePill type={transaction.transaction_type} />
          </View>
          <Text style={styles.timestamp}>{formatDateTime(transaction.created_at)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Card>
            <InfoRow
              label="Type"
              value={
                transaction.type === 'deposit' || transaction.transaction_type === 'deposit'
                  ? 'Simulated branch cash deposit'
                  : transaction.type === 'withdrawal' || transaction.transaction_type === 'withdrawal'
                  ? 'Simulated withdrawal'
                  : 'Internal SmartBank transfer'
              }
            />
            <Divider />
            <InfoRow
              label="Status"
              value={transaction.status === 'completed' ? 'Completed' : 'Failed'}
            />
            <Divider />
            <InfoRow label="Amount" value={`৳${Number(transaction.amount).toFixed(2)}`} />
            <Divider />
            <InfoRow label="Reference" value={transaction.reference || shortId(transaction.id)} />
            {transaction.description ? (
              <>
                <Divider />
                <InfoRow label="Description" value={transaction.description} />
              </>
            ) : null}
          </Card>
        </View>

        {justCompleted ? (
          <AuthButton
            title="Back to home"
            onPress={() => router.replace('/(customer)')}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function shortId(id: string): string {
  if (!id) return '—';
  return id.slice(0, 8).toUpperCase();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  heroBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  iconPlate: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconCredit: { backgroundColor: colors.successBg },
  iconDebit: { backgroundColor: colors.errorBg },
  iconNeutral: { backgroundColor: colors.surface },
  iconMark: { fontSize: 30, fontWeight: '800' },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  timestamp: {
    fontSize: typography.helper.size,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  infoLabel: { fontSize: typography.body.size, color: colors.textMuted },
  infoValue: {
    fontSize: typography.body.size,
    color: colors.text,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: colors.border },
});