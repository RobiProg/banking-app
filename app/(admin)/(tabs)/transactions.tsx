import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { ROUTES, transactionDetailsPath } from '../../../constants/routes';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { AuthInput } from '../../../components/auth/AuthInput';
import { TransactionTypePill } from '../../../components/banking/TransactionTypePill';
import { Money } from '../../../components/common/Money';
import { listAllTransactions, type AdminTxnFilters } from '../../../services/admin';
import type { Transaction, TransactionType } from '../../../types/db';
import { formatDateTime, formatSignedBDT } from '../../../utils/format';

const TYPE_FILTERS: { key: TransactionType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'transfer', label: 'Transfers' },
];

const STATUS_FILTERS: { key: Transaction['status'] | 'all'; label: string }[] = [
  { key: 'all', label: 'All status' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

/**
 * Admin transaction monitoring (Phase 17).
 * Read-only. Filter by type and status, search by transaction id prefix
 * or description text. Completed transactions are treated as
 * historical records (per plan §17 — no edit affordances).
 */
export default function AdminTransactionsTab() {
  const router = useRouter();
  const [filters, setFilters] = useState<AdminTxnFilters>({});
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Transaction['status'] | 'all'>('all');
  const [search, setSearch] = useState('');

  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const f: AdminTxnFilters = {
      type: typeFilter === 'all' ? undefined : typeFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
    };
    setFilters(f);
    const res = await listAllTransactions(f, 200);
    setLoading(false);
    if (res.errorMessage) setError(res.errorMessage);
    else setTxns(res.transactions);
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    reload();
  }, [reload]);

  const grouped = useMemo(() => groupByDate(txns), [txns]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${txns.length} ${txns.length === 1 ? 'record' : 'records'}`}
        </Text>
      </View>

      <View style={styles.filterBlock}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {TYPE_FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              active={typeFilter === f.key}
              onPress={() => setTypeFilter(f.key)}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              active={statusFilter === f.key}
              onPress={() => setStatusFilter(f.key)}
            />
          ))}
        </ScrollView>
        <View style={styles.searchWrap}>
          <AuthInput
            label=""
            value={search}
            onChangeText={setSearch}
            placeholder="Search by id prefix or text"
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.body}>
          <LoadingState label="Loading transactions…" />
        </View>
      ) : error ? (
        <View style={styles.body}>
          <ErrorState
            title="Could not load transactions"
            message={error}
            onRetry={reload}
          />
        </View>
      ) : txns.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No transactions"
            message={
              typeFilter !== 'all' || statusFilter !== 'all' || search
                ? 'No transactions match your filters.'
                : 'Customer activity will appear here.'
            }
          />
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(g) => g.label}
          contentContainerStyle={styles.list}
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Transaction ${shortId(t.id)}`}
                  onPress={() =>
                    router.push(transactionDetailsPath(t.id) as never)
                  }
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowDate}>{formatDateTime(t.created_at)}</Text>
                    <Text style={styles.rowMeta}>{shortId(t.id)}</Text>
                  </View>
                  <View style={styles.rowMid}>
                    <TransactionTypePill type={t.transaction_type} />
                    {t.description ? (
                      <Text style={styles.rowDesc} numberOfLines={1}>
                        {t.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.rowRight}>
                    <Money value={t.amount} size="medium" />
                    <Text style={styles.rowMeta}>{t.status}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filter ${label}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function groupByDate(
  items: Transaction[],
): { label: string; items: Transaction[] }[] {
  const groups = new Map<string, { label: string; items: Transaction[] }>();
  for (const t of items) {
    const label = formatDateTime(t.created_at).split(',')[0];
    if (!groups.has(label)) groups.set(label, { label, items: [] });
    groups.get(label)!.items.push(t);
  }
  return Array.from(groups.values());
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 2 },
  filterBlock: { paddingBottom: spacing.sm },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: 4 },
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
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: typography.label.size, fontWeight: '600', color: colors.text },
  chipLabelActive: { color: colors.textOnPrimary },
  pressed: { opacity: 0.85 },
  searchWrap: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  group: { marginTop: spacing.md },
  groupLabel: {
    fontSize: typography.label.size,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowLeft: { minWidth: 110 },
  rowDate: { fontSize: typography.body.size, color: colors.text, fontWeight: '600' },
  rowMeta: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 2 },
  rowMid: { flex: 1, paddingHorizontal: spacing.sm },
  rowDesc: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 4 },
  rowRight: { alignItems: 'flex-end' },
});