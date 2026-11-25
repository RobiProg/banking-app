import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../../components/ui/Icon';
import { TextInput } from '../../../components/ui/TextInput';
import { colors } from '../../../constants/colors';
import { radius, spacing } from '../../../constants/layout';
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
  { key: 'transfer', label: 'Transfers' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'withdrawal', label: 'Withdrawals' },
];

/**
 * Transactions Feed Screen. Matches Figma §10.
 * Filter chips, instant search, grouped by date.
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

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filter transactions by search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter(
      (t) =>
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        t.amount.toString().includes(q)
    );
  }, [transactions, searchQuery]);

  const grouped = useMemo(() => groupByDate(filteredTransactions), [filteredTransactions]);

  if (acctLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <LoadingState label="Loading transactions…" />
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
      {/* Top Bar (§10) */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Transactions</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get bank statement PDF"
            onPress={() => router.push(ROUTES.statement)}
            hitSlop={8}
            style={({ pressed }) => [styles.statementBtn, pressed && styles.pressed]}
          >
            <Icon name="document" size={16} color={colors.primary} />
            <Text style={styles.statementBtnText}>Statement</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle search"
            onPress={() => setShowSearch((prev) => !prev)}
            hitSlop={8}
            style={[styles.searchToggle, showSearch && styles.searchToggleActive]}
          >
            <Icon
              name="search"
              size={18}
              color={showSearch ? colors.primary : colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      {/* Expandable Search Input */}
      {showSearch && (
        <View style={styles.searchSection}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by reference, note, amount…"
            leftIcon="search"
            rightIcon={searchQuery ? 'close' : undefined}
            onRightIconPress={() => setSearchQuery('')}
            autoFocus
          />
        </View>
      )}

      {/* Filter Chips Bar */}
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

      {/* Content Area */}
      {txnsLoading ? (
        <View style={styles.loading}>
          <LoadingState label="Loading activity…" />
        </View>
      ) : txnsErr ? (
        <View style={styles.body}>
          <ErrorState
            title="Unable to load transactions"
            message={txnsErr}
            onRetry={reloadTxns}
          />
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No transactions found"
            message={
              searchQuery
                ? `No transactions match "${searchQuery}".`
                : 'Send or receive money to see transactions listed here.'
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
            <View key={group.dateKey} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{group.dateKey}</Text>
                <Text style={styles.groupCount}>{group.items.length} items</Text>
              </View>
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

function groupByDate(items: Transaction[]): { dateKey: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of items) {
    const label = dateGroupLabel(t.created_at);
    const bucket = map.get(label) ?? [];
    bucket.push(t);
    map.set(label, bucket);
  }
  const result: { dateKey: string; items: Transaction[] }[] = [];
  for (const [dateKey, list] of map.entries()) {
    result.push({ dateKey, items: list });
  }
  return result;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 24, // Figma specification: 24 pt bold
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  searchToggle: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  statementBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  searchToggleActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  filterRow: {
    paddingVertical: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.textOnPrimary,
  },
  pressed: {
    opacity: 0.85,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  group: {
    marginBottom: spacing.base,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCount: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
});
