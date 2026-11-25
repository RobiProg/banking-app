import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import type { Account } from '../../types/db';
import { maskAccountNumber } from '../../utils/format';
import { ToggleableBalance } from '../common/ToggleableBalance';

type Props = {
  account: Account;
  /** Override whether the balance is hidden behind asterisks. */
  hidden?: boolean;
  onToggleHide?: () => void;
};

/**
 * Account Row Card. Matches Figma §5 & §6.
 * 72pt tall card, 16pt radius, tinted bank plate, masked number and balance.
 */
export function AccountCard({ account, hidden, onToggleHide }: Props) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Savings account ${maskAccountNumber(account.account_number)}`}
      onPress={() => router.push(ROUTES.account)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <View style={styles.iconPlate}>
          <Icon name="bank" size={20} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>Simulated Savings</Text>
          <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
            {maskAccountNumber(account.account_number)}
            {account.branch?.name ? ` • ${account.branch.name}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <ToggleableBalance
          value={account.balance}
          size="medium"
          iconSize={16}
          buttonSize={28}
          hidden={hidden}
          onToggleHide={onToggleHide}
        />
        <Icon name="chevron-right" size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg, // 16pt
    paddingHorizontal: spacing.base, // 16pt
    height: 72, // 72pt
  },
  pressed: {
    opacity: 0.9,
    backgroundColor: colors.surfaceSubtle,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  iconPlate: {
    width: 40, // 40 pt square with rounded corners
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15, // 15 pt weight 600
    fontWeight: '600',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexShrink: 0,
  },
});
