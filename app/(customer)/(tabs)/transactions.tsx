import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { ROUTES } from '../../../constants/routes';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { TransactionRow } from '../../../components/banking/TransactionRow';
import { useAccount } from '../../../hooks/useAccount';
import { useTransactions } from '../../../hooks/useTransactions';
import { txnDirection, type Transaction, type TransactionType } from '../../../types/db';
import { dateGroupLabel } from '../../../utils/format';

type FilterValue = TransactionType | 'all';

const FILTERS: { key: FilterValue; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'transfer', label: 'Transfers' },
];

/**
 * Customer transactions tab (Phase 11).
 * Filter pills, grouped by date, Realtime updates via useTransactions.
 */
export default function CustomerTransactionsTab() {
  const router = useRouter();
  const { account, loading: acctLoading, errorMessage: acctErr, reload } = useAccount();
  const myAccountId = account?.id ?? null;
  const {
    transactions,
    loading: txnsLoading,
    errorMessage: txnsErr,
    filter,
    setFilter,
    reload: reloadTxns,
  } = useTransactions({ myAccountId, autoLoad: !!account, limit: 200 });

  const grouped = useMemo(() => groupByDate(transactions), [transactions]);

  if (acctLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <LoadingState label="Loading account…" />
        </View>
      </SafeAreaView>
    );
  }
  if (acctErr || !account) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.body}>
          <ErrorState
            title="Account unavailable"
            message={acctErr ?? 'Account not found.'}
            onRetry={reload}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter ${f.label}`}
                onPress={() => setFilter(f.key)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {txnsLoading ? (
        <View style={styles.body}>
          <LoadingState label="Loading transactions…" />
        </View>
      ) : txnsErr ? (
        <View style={styles.body}>
          <ErrorState
            title="Could not load transactions"
            message={txnsErr}
            onRetry={reloadTxns}
          />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No transactions yet"
            message={
              filter === 'all'
                ? 'Once you make or receive money, your activity will appear here.'
                : `You have no ${filter} transactions yet.`
            }
            ctaLabel="Send money"
            onPressCta={() => router.push(ROUTES.sendMoney)}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  direction={txnDirection(t, myAccountId)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function groupByDate(
  txns: Transaction[],
): { label: string; items: Transaction[] }[] {
  const groups = new Map<string, { label: string; items: Transaction[] }>();
  for (const t of txns) {
    const label = dateGroupLabel(t.created_at);
    if (!groups.has(label)) groups.set(label, { label, items: [] });
    groups.get(label)!.items.push(t);
  }
  return Array.from(groups.values());
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  filterRow: {
    paddingVertical: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: typography.label.size,
    fontWeight: '600',
    color: colors.text,
  },
  chipLabelActive: {
    color: colors.textOnPrimary,
  },
  pressed: { opacity: 0.85 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  group: {
    marginTop: spacing.md,
  },
  groupLabel: {
    fontSize: typography.label.size,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
});