import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';

type Action = {
  key: string;
  label: string;
  glyph: string;
  route: string;
};

const ACTIONS: Action[] = [
  { key: 'send', label: 'Send', glyph: '→', route: ROUTES.sendMoney },
  { key: 'deposit', label: 'Deposit', glyph: '+', route: ROUTES.deposit },
  { key: 'withdraw', label: 'Withdraw', glyph: '−', route: ROUTES.withdraw },
  { key: 'account', label: 'Account', glyph: '◧', route: ROUTES.account },
];

/**
 * 4-tile quick action row. Matches DESIGN_PROMPT §5.
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
            <Text style={styles.glyph}>{a.glyph}</Text>
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
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  iconPlate: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
  },
  glyph: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  label: {
    fontSize: typography.label.size,
    color: colors.text,
    fontWeight: '600',
  },
  pressed: { opacity: 0.85 },
});