import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES, transactionDetailsPath } from '../../constants/routes';
import type { Transaction, TxnDirection } from '../../types/db';
import { formatSignedBDT } from '../../utils/format';
import { Money } from '../common/Money';
import { TransactionTypePill } from './TransactionTypePill';

type Props = {
  transaction: Transaction;
  direction: TxnDirection;
  /** Account number of the *other* party, when applicable. */
  counterpartAccountNumber?: string | null;
};

/**
 * Compact 64 pt-tall transaction row. Tap → transaction details.
 */
export function TransactionRow({ transaction, direction, counterpartAccountNumber }: Props) {
  const router = useRouter();

  const sign: 'positive' | 'negative' = direction === 'credit' ? 'positive' : 'negative';
  const amountColor =
    direction === 'credit' ? colors.success : direction === 'debit' ? colors.error : colors.text;

  const meta = subtitleFor(transaction, direction, counterpartAccountNumber);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${TYPE_LABEL[transaction.transaction_type]}, ${formatSignedBDT(transaction.amount, sign)}`}
      onPress={() => router.push(transactionDetailsPath(transaction.id))}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View style={[styles.icon, { backgroundColor: ICON_BG[transaction.transaction_type] }]}>
          <Text style={[styles.iconMark, { color: ICON_FG[transaction.transaction_type] }]}>
            {TYPE_GLYPH[transaction.transaction_type]}
          </Text>
        </View>
      </View>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {TITLE[transaction.transaction_type]}
          </Text>
          <TransactionTypePill type={transaction.transaction_type} />
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={styles.right}>
        <Money
          value={transaction.amount}
          size="medium"
          color={amountColor}
        />
        <Text style={[styles.meta, styles.timeText]}>
          {timeShort(transaction.created_at)}
        </Text>
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
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer: 'Money transfer',
};
const TYPE_GLYPH: Record<Transaction['transaction_type'], string> = {
  deposit: '+',
  withdrawal: '−',
  transfer: '→',
};
const ICON_BG: Record<Transaction['transaction_type'], string> = {
  deposit: colors.successBg,
  withdrawal: colors.errorBg,
  transfer: colors.primaryLight,
};
const ICON_FG: Record<Transaction['transaction_type'], string> = {
  deposit: colors.success,
  withdrawal: colors.error,
  transfer: colors.primaryDark,
};

function subtitleFor(
  t: Transaction,
  direction: TxnDirection,
  counterpartAccountNumber?: string | null,
): string {
  const effType = t.type ?? t.transaction_type;
  if (effType === 'deposit') return t.description || 'Simulated branch deposit';
  if (effType === 'withdrawal') return 'Simulated withdrawal';
  if (effType === 'transfer') {
    if (direction === 'credit') return `From ${counterpartAccountNumber ?? 'SmartBank account'}`;
    if (direction === 'debit') return `To ${counterpartAccountNumber ?? 'SmartBank account'}`;
  }
  return t.description ?? '';
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
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  left: {
    marginRight: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMark: {
    fontSize: 18,
    fontWeight: '800',
  },
  middle: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: typography.helper.size,
    color: colors.textMuted,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 90,
  },
  timeText: {
    marginTop: 2,
  },
});