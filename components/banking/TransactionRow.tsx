import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { transactionDetailsPath } from '../../constants/routes';
import type { Transaction, TxnDirection } from '../../types/db';
import { formatSignedBDT } from '../../utils/format';
import { Money } from '../common/Money';

type Props = {
  transaction: Transaction;
  direction: TxnDirection;
  /** Account number of the *other* party, when applicable. */
  counterpartAccountNumber?: string | null;
};

/**
 * Transaction Row. Matches Figma §5 & §10.
 * Compact 64 pt-tall row with category-tinted 40pt circular avatar,
 * merchant/counterpart title, timestamp, and tabular-nums amount.
 */
export function TransactionRow({
  transaction,
  direction,
  counterpartAccountNumber,
}: Props) {
  const router = useRouter();

  const sign: 'positive' | 'negative' = direction === 'credit' ? 'positive' : 'negative';
  const amountColor =
    direction === 'credit' ? colors.success : direction === 'debit' ? colors.error : colors.textPrimary;

  const meta = subtitleFor(transaction, direction, counterpartAccountNumber);
  const iconName = ICON_MAP[transaction.transaction_type] || 'history';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${TYPE_LABEL[transaction.transaction_type]}, ${formatSignedBDT(transaction.amount, sign)}`}
      onPress={() => router.push(transactionDetailsPath(transaction.id))}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: ICON_BG[transaction.transaction_type] },
          ]}
        >
          <Icon
            name={iconName}
            size={18}
            color={ICON_FG[transaction.transaction_type]}
          />
        </View>
      </View>

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {TITLE[transaction.transaction_type]}
        </Text>
        <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
          {meta}
        </Text>
      </View>

      <View style={styles.right}>
        <Money
          value={transaction.amount}
          size="medium"
          color={amountColor}
          sign={sign}
        />
        <Text style={styles.timeText}>{timeShort(transaction.created_at)}</Text>
      </View>
    </Pressable>
  );
}

const TYPE_LABEL: Record<Transaction['transaction_type'], string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer: 'Transfer',
};

const TITLE: Record<Transaction['transaction_type'], string> = {
  deposit: 'Cash Counter Deposit',
  withdrawal: 'Simulated Cash Out',
  transfer: 'P2P Money Transfer',
};

const ICON_MAP: Record<Transaction['transaction_type'], IconName> = {
  deposit: 'arrow-down',
  withdrawal: 'arrow-up',
  transfer: 'send',
};

const ICON_BG: Record<Transaction['transaction_type'], string> = {
  deposit: colors.successBg,
  withdrawal: colors.warningBg,
  transfer: colors.primaryLight,
};

const ICON_FG: Record<Transaction['transaction_type'], string> = {
  deposit: colors.success,
  withdrawal: colors.warning,
  transfer: colors.primary,
};

function subtitleFor(
  t: Transaction,
  direction: TxnDirection,
  counterpartAccountNumber?: string | null,
): string {
  const effType = t.type ?? t.transaction_type;
  if (effType === 'deposit') return t.description || 'Branch Counter Credit';
  if (effType === 'withdrawal') return 'ATM / Teller Counter Outflow';
  if (effType === 'transfer') {
    if (direction === 'credit') return `From ${counterpartAccountNumber ?? 'SmartBank Account'}`;
    if (direction === 'debit') return `To ${counterpartAccountNumber ?? 'SmartBank Account'}`;
  }
  return t.description ?? 'Digital Banking Transaction';
}

function timeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64, // Figma specification: 64 pt tall
    paddingHorizontal: spacing.base, // 16 pt
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.background,
    borderRadius: radius.lg, // 16 pt
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
    backgroundColor: colors.surfaceSubtle,
  },
  left: {
    marginRight: spacing.md,
    flexShrink: 0,
  },
  iconCircle: {
    width: 40, // 40 pt circle avatar
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timeText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
