import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { AuthInput } from '../../../components/auth/AuthInput';
import { AccountRow, StatusPill } from '../../../components/admin/AccountRow';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import {
  adminUpdateAccountStatus,
  listAccounts,
  type AdminAccountRow,
} from '../../../services/admin';
import type { AccountStatus } from '../../../types/db';

/**
 * Admin accounts tab (Phase 16).
 * - Search by account number.
 * - Tap → modal to change status (active / inactive / blocked).
 * - Status change goes through the admin_update_account_status RPC.
 */
export default function AdminAccountsTab() {
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [selected, setSelected] = useState<AdminAccountRow | null>(null);
  const [nextStatus, setNextStatus] = useState<AccountStatus | null>(null);
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
    setUpdateError(null);
  }

  async function confirmStatusChange() {
    if (!selected || !nextStatus) return;
    setUpdating(true);
    setUpdateError(null);
    const res = await adminUpdateAccountStatus(selected.id, nextStatus);
    setUpdating(false);
    if (res.errorMessage) {
      setUpdateError(res.errorMessage);
      return;
    }
    setSelected(null);
    setNextStatus(null);
    reload();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Accounts</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`}
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
      ) : accounts.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No accounts found"
            message={
              query
                ? `No accounts match "${query}".`
                : 'Customer accounts will appear here once they are created.'
            }
          />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.rowWrap}>
              <View style={styles.rowHeader}>
                <AccountRow
                  account={item}
                  holderName={item.full_name}
                />
              </View>
              <View style={styles.actions}>
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
              {updateError ? <Text style={styles.errLine}>{updateError}</Text> : null}
            </View>
          )}
        />
      )}

      <ConfirmDialog
        visible={!!selected && !!nextStatus}
        title={`Set account to ${nextStatus ?? ''}?`}
        message={
          selected
            ? `Account ${selected.account_number} (${selected.full_name ?? '—'}) will be set to "${nextStatus}". The next status change will re-evaluate their access.`
            : ''
        }
        confirmLabel={`Set ${nextStatus ?? ''}`}
        destructive={nextStatus === 'blocked'}
        loading={updating}
        onConfirm={confirmStatusChange}
        onCancel={() => {
          if (updating) return;
          setSelected(null);
          setNextStatus(null);
          setUpdateError(null);
        }}
      />
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  onPress,
  destructive,
  disabled,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        destructive && styles.actionDestructive,
        disabled && styles.actionDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.actionLabel,
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
    paddingBottom: spacing.sm,
  },
  list: { paddingBottom: spacing.xl },
  rowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowHeader: {},
  actions: {
    flexDirection: 'row',
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
  actionLabelDestructive: { color: colors.error },
  actionLabelDisabled: { color: colors.textMuted },
  pressed: { opacity: 0.85 },
  errLine: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    color: colors.error,
    fontSize: typography.helper.size,
  },
});