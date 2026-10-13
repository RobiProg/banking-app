import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import type { TransactionType } from '../../types/db';

type Props = {
  type: TransactionType;
};

/**
 * Coloured pill for a transaction type. Used in transaction rows and
 * detail screens so the user can scan the list quickly.
 */
export function TransactionTypePill({ type }: Props) {
  const cfg = TYPE_STYLE[type];
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

const TYPE_STYLE: Record<TransactionType, { label: string; bg: string; fg: string }> = {
  deposit: { label: 'Deposit', bg: colors.successBg, fg: colors.success },
  withdrawal: { label: 'Withdrawal', bg: colors.errorBg, fg: colors.error },
  transfer: { label: 'Transfer', bg: colors.primaryLight, fg: colors.primaryDark },
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});