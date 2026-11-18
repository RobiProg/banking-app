import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';

type Action = {
  key: string;
  label: string;
  icon: IconName;
  route: string;
};

const ACTIONS: Action[] = [
  { key: 'send', label: 'Send', icon: 'send', route: ROUTES.sendMoney },
  { key: 'deposit', label: 'Deposit', icon: 'bank', route: ROUTES.deposit },
  { key: 'withdraw', label: 'Withdraw', icon: 'arrow-down', route: ROUTES.withdraw },
  { key: 'account', label: 'Account', icon: 'card', route: ROUTES.account },
];

/**
 * 4-tile Quick Action Grid. Matches Figma §5.
 * 56pt circular buttons with Primary Light tint (#E6F0FB) and Primary icons.
 */
export function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => (
        <Pressable
          key={a.key}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={() => router.push(a.route)}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.iconPlate}>
            <Icon name={a.icon} size={22} color={colors.primary} />
          </View>
          <Text style={styles.label}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  iconPlate: {
    width: 56, // Figma specification: 56 pt circular button
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(10, 107, 211, 0.08)',
  },
  label: {
    fontSize: 12, // Figma specification: 12 pt below
    color: colors.textPrimary,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
