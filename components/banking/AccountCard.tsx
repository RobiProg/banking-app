import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import type { Account } from '../../types/db';
import { maskAccountNumber } from '../../utils/format';
import { Money } from '../common/Money';

type Props = {
  account: Account;
};

/**
 * Compact row showing the user's account — used on the dashboard's
 * "Account" tile area and on the accounts list (one account in v1).
 */
export function AccountCard({ account }: Props) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Savings account ${maskAccountNumber(account.account_number)}`}
      onPress={() => router.push(ROUTES.account)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View style={styles.iconPlate}>
          <Text style={styles.glyph}>◧</Text>
        </View>
        <View style={styles.middle}>
          <Text style={styles.title}>Savings Account</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {maskAccountNumber(account.account_number)}
            {account.branch?.name ? ` • ${account.branch.name}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Money value={account.balance} size="medium" />
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 72,
  },
  pressed: { opacity: 0.9 },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconPlate: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  glyph: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  middle: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    marginLeft: spacing.sm,
  },
});