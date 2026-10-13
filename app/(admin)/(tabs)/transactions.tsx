import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { formatBDT, formatDateTime, formatSignedBDT } from '../../../utils/format';

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
  const [filters, setFilters] = useState<AdminTxnFilters>({});
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Transaction['status'] | 'all'>('all');
  const [search, setSearch] = useState('');

  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

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
            placeholder="Search by reference (TXN-...), note, or id"
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
              {group.items.map((t) => {
                const branchObj = (t as unknown as { branches?: { name: string; district: string } }).branches;
                const refDisplay = t.reference || shortId(t.id);

                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Transaction ${refDisplay}`}
                    onPress={() => setSelectedTxn(t)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowRef} numberOfLines={1}>{refDisplay}</Text>
                      <Text style={styles.rowDate}>{formatDateTime(t.created_at)}</Text>
                      {branchObj ? (
                        <Text style={styles.rowBranch} numberOfLines={1}>
                          📍 {branchObj.name}
                        </Text>
                      ) : null}
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
                      <Text
                        style={[
                          styles.rowStatus,
                          t.status === 'completed' ? styles.statusCompleted : styles.statusFailed,
                        ]}
                      >
                        {t.status.toUpperCase()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      )}

      {/* Admin Transaction Detail Modal */}
      <Modal
        visible={!!selectedTxn}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTxn(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setSelectedTxn(null)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            {selectedTxn ? (
              <ScrollView style={{ maxHeight: 380 }}>
                <View style={styles.modalAmountBox}>
                  <Text style={styles.modalAmountLabel}>Amount</Text>
                  <Text style={styles.modalAmountVal}>{formatBDT(selectedTxn.amount)}</Text>
                  <View style={{ marginTop: 6 }}>
                    <TransactionTypePill type={selectedTxn.transaction_type} />
                  </View>
                </View>

                <DetailItem label="Reference" value={selectedTxn.reference || selectedTxn.id} mono />
                <DetailItem label="Status" value={selectedTxn.status.toUpperCase()} />
                <DetailItem label="Date & Time" value={formatDateTime(selectedTxn.created_at)} />
                {selectedTxn.description ? (
                  <DetailItem label="Description" value={selectedTxn.description} />
                ) : null}
                {(selectedTxn as unknown as { branches?: { name: string; district: string } }).branches ? (
                  <DetailItem
                    label="Branch"
                    value={`${(selectedTxn as unknown as { branches: { name: string; district: string } }).branches.name} (${(selectedTxn as unknown as { branches: { name: string; district: string } }).branches.district})`}
                  />
                ) : null}
                {selectedTxn.sender_account_id ? (
                  <DetailItem label="Sender Account ID" value={selectedTxn.sender_account_id} mono />
                ) : null}
                {selectedTxn.receiver_account_id ? (
                  <DetailItem label="Receiver Account ID" value={selectedTxn.receiver_account_id} mono />
                ) : null}
                {selectedTxn.idempotency_key ? (
                  <DetailItem label="Idempotency Key" value={selectedTxn.idempotency_key} mono />
                ) : null}
              </ScrollView>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss details"
              onPress={() => setSelectedTxn(null)}
              style={({ pressed }) => [styles.modalDismissBtn, pressed && styles.pressed]}
            >
              <Text style={styles.modalDismissText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailVal, mono && styles.monoVal]}>{value}</Text>
    </View>
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
  rowLeft: { flex: 1.2 },
  rowRef: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowDate: { fontSize: typography.caption.size, color: colors.textMuted, marginTop: 2 },
  rowBranch: { fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '600' },
  rowMid: { flex: 1, paddingHorizontal: spacing.xs },
  rowDesc: { fontSize: typography.caption.size, color: colors.textMuted, marginTop: 4 },
  rowRight: { alignItems: 'flex-end', minWidth: 90 },
  rowStatus: { fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 0.4 },
  statusCompleted: { color: colors.success },
  statusFailed: { color: colors.error },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { padding: spacing.xs },
  closeText: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  modalAmountBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalAmountLabel: { fontSize: typography.caption.size, color: colors.textMuted },
  modalAmountVal: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2 },
  detailItem: {
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: typography.caption.size, color: colors.textMuted },
  detailVal: { fontSize: typography.body.size, color: colors.text, fontWeight: '600', marginTop: 1 },
  monoVal: { fontSize: 12, fontFamily: 'monospace' },
  modalDismissBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  modalDismissText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: typography.body.size },
});