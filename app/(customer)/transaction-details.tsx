import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon, IconName } from '../../components/ui/Icon';
import { Badge } from '../../components/ui/Badge';
import { Money } from '../../components/common/Money';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../hooks/useAccount';
import { getTransactionById } from '../../services/transactions';
import type { Transaction as TxnModel } from '../../types/db';
import { txnDirection } from '../../types/db';
import { formatDateTime } from '../../utils/format';

/**
 * Transaction Details Screen. Matches Figma §11.
 * Shows centered status hero, tabular amount, category-tinted icon,
 * structured receipt rows, and action CTAs.
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
        <LoadingState label="Loading transaction details…" />
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
    direction === 'credit' ? colors.success : direction === 'debit' ? colors.error : colors.textPrimary;
  const amountPrefix = sign === 'positive' ? '+' : sign === 'negative' ? '−' : '';

  const type = transaction.transaction_type;
  const iconName: IconName = type === 'deposit' ? 'arrow-down' : type === 'withdrawal' ? 'arrow-up' : 'send';
  const iconBg =
    direction === 'credit'
      ? colors.successBg
      : direction === 'debit'
      ? colors.errorBg
      : colors.primaryLight;
  const iconFg =
    direction === 'credit'
      ? colors.success
      : direction === 'debit'
      ? colors.error
      : colors.primary;

  const title =
    type === 'deposit'
      ? 'Cash Counter Deposit'
      : type === 'withdrawal'
      ? 'Cash Withdrawal'
      : direction === 'credit'
      ? 'Money Received'
      : 'Money Sent';

  function handleCopyReference() {
    Alert.alert('Reference Copied', `${transaction?.reference} copied to clipboard.`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={justCompleted ? 'Transaction Complete' : 'Transaction Details'}
        subtitle={justCompleted ? 'Your transaction has been processed' : undefined}
        rightLabel={justCompleted ? 'Done' : undefined}
        onPressRight={() => router.replace(ROUTES.customer)}
        onPressBack={justCompleted ? () => router.replace(ROUTES.customer) : undefined}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Centered Status Hero (§11) */}
        <View style={styles.heroCard}>
          <View style={[styles.heroIconCircle, { backgroundColor: iconBg }]}>
            <Icon name={iconName} size={32} color={iconFg} />
          </View>
          <Text style={styles.heroAmount}>
            {amountPrefix}
            <Money value={transaction.amount} size="xl" color={amountColor} />
          </Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={transaction.status === 'completed' ? 'Completed' : 'Failed'}
              variant={transaction.status === 'completed' ? 'success' : 'error'}
            />
          </View>
          <Text style={styles.heroTimestamp}>{formatDateTime(transaction.created_at)}</Text>
        </View>

        {/* Structured Receipt Info Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <Card style={styles.detailsCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transaction Type</Text>
              <Text style={styles.infoValue}>
                {type === 'deposit'
                  ? 'Branch Cash Deposit'
                  : type === 'withdrawal'
                  ? 'Simulated Cash Out'
                  : 'P2P Fund Transfer'}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reference Code</Text>
              <Pressable style={styles.copyRow} onPress={handleCopyReference}>
                <Text style={styles.referenceText}>{transaction.reference}</Text>
                <Icon name="copy" size={15} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Amount</Text>
              <Money value={transaction.amount} size="medium" color={amountColor} />
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transfer Fee</Text>
              <Text style={styles.infoValue}>৳0.00 (Free)</Text>
            </View>
            <View style={styles.divider} />

            {transaction.description ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Note</Text>
                  <Text style={styles.infoValue}>{transaction.description}</Text>
                </View>
                <View style={styles.divider} />
              </>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{formatDateTime(transaction.created_at)}</Text>
            </View>
          </Card>
        </View>

        {/* CTA Buttons */}
        <View style={styles.actionsGroup}>
          <Button
            title="Return to Dashboard"
            onPress={() => router.replace(ROUTES.customer)}
            size="lg"
            variant="primary"
          />
          <Button
            title="View All Transactions"
            onPress={() => router.push(ROUTES.transactions)}
            size="md"
            variant="outline"
          />
        </View>
      </ScrollView>
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
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badgeRow: {
    marginTop: 2,
    marginBottom: 4,
  },
  heroTimestamp: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailsCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  referenceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  actionsGroup: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
