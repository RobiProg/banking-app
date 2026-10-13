import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import type { Account } from '../../types/db';
import { formatBDT } from '../../utils/format';
import { Money } from '../common/Money';

type Props = {
  account: Account;
  /** Hide the actual balance behind a mask. */
  hidden?: boolean;
  onToggleHide?: () => void;
};

/**
 * Gradient hero balance card. Matches DESIGN_PROMPT §5 / §7.
 * Tapping anywhere on the card navigates to the account details.
 */
export function BalanceCard({ account, hidden = false, onToggleHide }: Props) {
  const router = useRouter();

  const isBlocked = account?.status === 'blocked';
  const isInactive = account?.status === 'inactive';

  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={styles.label}>Available balance</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
          accessibilityState={{ selected: hidden }}
          onPress={() => onToggleHide?.()}
          hitSlop={8}
          style={styles.eyeBtn}
        >
          <Text style={styles.eye}>{hidden ? '◉' : '◎'}</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Available balance ${formatBDT(account?.balance)}, account ${account?.account_number}`}
        onPress={() => router.push(ROUTES.account)}
        style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
      >
        <View style={styles.balanceRow}>
          {hidden ? (
            <Text style={styles.masked}>৳ ••••••</Text>
          ) : (
            <Money value={account?.balance ?? 0} size="xl" color={colors.textOnPrimary} />
          )}
        </View>

        <View style={styles.rowBottom}>
          <View>
            <Text style={styles.accountLabel}>Savings account</Text>
            <Text style={styles.accountNumber} numberOfLines={1}>
              {account?.account_number ?? '—'}
              {account?.branch?.name ? ` • ${account.branch.name}` : ''}
            </Text>
          </View>
          {isBlocked ? (
            <View style={[styles.badge, styles.badgeBlocked]}>
              <Text style={[styles.badgeText, styles.badgeTextBlocked]}>Blocked</Text>
            </View>
          ) : isInactive ? (
            <View style={[styles.badge, styles.badgeInactive]}>
              <Text style={[styles.badgeText, styles.badgeTextInactive]}>Inactive</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeActive]}>
              <Text style={[styles.badgeText, styles.badgeTextActive]}>Active</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.lg,
    minHeight: 180,
    justifyContent: 'space-between',
    // Soft elevation
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  pressed: { opacity: 0.96 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textOnPrimary,
    opacity: 0.85,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  eyeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eye: {
    color: colors.textOnPrimary,
    opacity: 0.9,
    fontSize: 18,
  },
  balanceRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  masked: {
    color: colors.textOnPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  accountLabel: {
    color: colors.textOnPrimary,
    opacity: 0.75,
    fontSize: 12,
    fontWeight: '500',
  },
  accountNumber: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeInactive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeBlocked: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeTextActive: { color: colors.textOnPrimary },
  badgeTextInactive: { color: colors.textOnPrimary },
  badgeTextBlocked: { color: colors.textOnPrimary },
});