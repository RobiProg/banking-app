import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { AuthInput } from '../../../components/auth/AuthInput';
import { AccountRow, StatusPill } from '../../../components/admin/AccountRow';
import {
  adminSetAccountStatus,
  listAccounts,
  type AdminAccountRow,
} from '../../../services/admin';
import type { AccountStatus } from '../../../types/db';

const STATUS_FILTERS: { key: AccountStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All status' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'blocked', label: 'Blocked' },
];

/**
 * Admin accounts tab (Phase 6, FR-ADM-04, FR-ADM-08, TC-15).
 * - Search by account number or customer name.
 * - Filter by status (active / inactive / blocked).
 * - Displays assigned branch and district.
 * - Tap status action -> modal to specify reason -> logged to audit_logs table.
 */
export default function AdminAccountsTab() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');

  const [selected, setSelected] = useState<AdminAccountRow | null>(null);
  const [nextStatus, setNextStatus] = useState<AccountStatus | null>(null);
  const [reason, setReason] = useState('Administrative compliance review');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const reload = useCallback(async (q = query) => {
    setLoading(true);
    setError(null);
    const res = await listAccounts(q);
    setLoading(false);
    if (res.errorMessage) setError(res.errorMessage);
    else setAccounts(res.accounts);
  }, [query]);

  useEffect(() => {
    reload('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startStatusChange(acc: AdminAccountRow, status: AccountStatus) {
    setSelected(acc);
    setNextStatus(status);
    setReason(
      status === 'blocked'
        ? 'Suspicious activity or AML hold'
        : status === 'inactive'
        ? 'Dormant account decommission'
        : 'Reactivated upon customer request'
    );
    setUpdateError(null);
  }

  async function confirmStatusChange() {
    if (!selected || !nextStatus) return;
    if (!reason.trim()) {
      setUpdateError('Please provide a reason for the audit log.');
      return;
    }
    setUpdating(true);
    setUpdateError(null);
    const res = await adminSetAccountStatus(selected.id, nextStatus, reason.trim());
    setUpdating(false);
    if (res.errorMessage) {
      setUpdateError(res.errorMessage);
      return;
    }
    setSelected(null);
    setNextStatus(null);
    reload();
  }

  const filteredAccounts = useMemo(() => {
    if (statusFilter === 'all') return accounts;
    return accounts.filter((a) => a.status === statusFilter);
  }, [accounts, statusFilter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Accounts</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${filteredAccounts.length} ${filteredAccounts.length === 1 ? 'account' : 'accounts'}`}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <AuthInput
          label=""
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            reload(t);
          }}
          placeholder="Search by account number"
          autoCapitalize="characters"
          autoCorrect={false}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${f.label}`}
            onPress={() => setStatusFilter(f.key)}
            style={({ pressed }) => [
              styles.chip,
              statusFilter === f.key && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                statusFilter === f.key && styles.chipLabelActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.body}>
          <LoadingState label="Loading accounts…" />
        </View>
      ) : error ? (
        <View style={styles.body}>
          <ErrorState
            title="Could not load accounts"
            message={error}
            onRetry={() => reload()}
          />
        </View>
      ) : filteredAccounts.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No accounts found"
            message={
              query || statusFilter !== 'all'
                ? `No accounts match your current search or status filter.`
                : 'Customer accounts will appear here once they are created.'
            }
          />
        </View>
      ) : (
        <FlatList
          data={filteredAccounts}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.rowWrap}>
              <View style={styles.rowHeader}>
                <AccountRow
                  account={item}
                  holderName={item.full_name}
                  branchName={item.branch_name}
                  branchDistrict={item.branch_district}
                />
              </View>
              <View style={styles.actions}>
                <ActionButton
                  label="Deposit 💵"
                  highlight
                  disabled={item.status !== 'active'}
                  onPress={() => {
                    router.push({
                      pathname: '/(admin)/deposit',
                      params: { account: item.account_number },
                    });
                  }}
                />
                <ActionButton
                  label="Activate"
                  onPress={() => startStatusChange(item, 'active')}
                  disabled={item.status === 'active'}
                />
                <ActionButton
                  label="Deactivate"
                  onPress={() => startStatusChange(item, 'inactive')}
                  disabled={item.status === 'inactive'}
                />
                <ActionButton
                  label="Block"
                  destructive
                  onPress={() => startStatusChange(item, 'blocked')}
                  disabled={item.status === 'blocked'}
                />
              </View>
            </View>
          )}
        />
      )}

      {/* Audit Reason & Status Change Modal */}
      <Modal
        visible={!!selected && !!nextStatus}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!updating) {
            setSelected(null);
            setNextStatus(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Change Account Status to {nextStatus ? nextStatus.toUpperCase() : ''}
            </Text>
            <Text style={styles.modalMeta}>
              Account: {selected?.account_number} ({selected?.full_name ?? '—'})
            </Text>
            <Text style={styles.modalNotice}>
              This action will be logged in the immutable audit log table for bank compliance (FR-ADM-08, TC-15).
            </Text>

            <Text style={styles.inputLabel}>Reason for status update *</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Enter audit reason..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              editable={!updating}
            />

            {updateError ? <Text style={styles.modalErr}>{updateError}</Text> : null}

            <View style={styles.modalButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                disabled={updating}
                onPress={() => {
                  setSelected(null);
                  setNextStatus(null);
                  setUpdateError(null);
                }}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Confirm ${nextStatus ?? ''}`}
                disabled={updating}
                onPress={confirmStatusChange}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  nextStatus === 'blocked' && styles.confirmBtnDestructive,
                  pressed && styles.pressed,
                  updating && styles.disabled,
                ]}
              >
                <Text style={styles.confirmText}>
                  {updating ? 'Saving…' : `Set ${nextStatus ?? ''}`}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  onPress,
  destructive,
  disabled,
  highlight,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        highlight && styles.actionHighlight,
        destructive && styles.actionDestructive,
        disabled && styles.actionDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.actionLabel,
          highlight && styles.actionLabelHighlight,
          destructive && styles.actionLabelDestructive,
          disabled && styles.actionLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
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
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
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
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: colors.textOnPrimary,
  },
  list: { paddingBottom: spacing.xl },
  rowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowHeader: {},
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHighlight: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionDestructive: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
  },
  actionDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    opacity: 0.5,
  },
  actionLabel: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionLabelHighlight: {
    color: colors.textOnPrimary,
  },
  actionLabelDestructive: { color: colors.error },
  actionLabelDisabled: { color: colors.textMuted },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  errLine: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    color: colors.error,
    fontSize: typography.helper.size,
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalMeta: {
    fontSize: typography.body.size,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  modalNotice: {
    fontSize: typography.caption.size,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.label.size,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.body.size,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalErr: {
    color: colors.error,
    fontSize: typography.caption.size,
    marginBottom: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.text,
  },
  confirmBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  confirmBtnDestructive: {
    backgroundColor: colors.error,
  },
  confirmText: {
    fontSize: typography.body.size,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});