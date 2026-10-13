import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import type { Account, AccountStatus } from '../../types/db';
import { Money } from '../common/Money';
import { formatBDT } from '../../utils/format';

type Props = {
  account: Account;
  /** Optional holder info shown under the account number. */
  holderName?: string | null;
  onPress?: () => void;
};

/**
 * Row used in the admin accounts list. Tap → opens the status-change
 * dialog (handled at the screen level).
 */
export function AccountRow({ account, holderName, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Account ${account.account_number}, balance ${formatBDT(account.balance)}, ${account.status}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.middle}>
        <Text style={styles.number}>{account.account_number}</Text>
        {holderName ? (
          <Text style={styles.meta} numberOfLines={1}>
            {holderName}
          </Text>
        ) : null}
        <View style={styles.statusRow}>
          <StatusPill status={account.status} />
          <Text style={styles.typeLabel}>{account.account_type}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Money value={account.balance} size="medium" />
      </View>
    </Pressable>
  );
}

export function StatusPill({ status }: { status: AccountStatus }) {
  const cfg = STATUS_STYLE[status];
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.pillText, { color: cfg.fg }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

const STATUS_STYLE: Record<AccountStatus, { bg: string; fg: string }> = {
  active: { bg: colors.successBg, fg: colors.success },
  inactive: { bg: colors.warning + '22', fg: colors.warning },
  blocked: { bg: colors.errorBg, fg: colors.error },
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.85 },
  middle: { flex: 1, paddingRight: spacing.sm },
  number: { fontSize: typography.body.size, fontWeight: '700', color: colors.text },
  meta: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs + 2 },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  right: { alignItems: 'flex-end' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
});