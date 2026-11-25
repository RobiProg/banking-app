import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import type { Account } from '../../types/db';
import { ToggleableBalance } from '../common/ToggleableBalance';

type Props = {
  account: Account;
  /** Override whether the balance is hidden behind asterisks. */
  hidden?: boolean;
  onToggleHide?: () => void;
};

/**
 * Hero Balance Card. Matches Figma §5 & §7.
 * Primary gradient feel (#0A6BD3 to #0856A8), 20pt radius,
 * masked balance with adjacent eye visibility toggle, and pill action button for account details.
 */
export function BalanceCard({ account, hidden, onToggleHide }: Props) {
  const router = useRouter();

  const isBlocked = account?.status === 'blocked';
  const isInactive = account?.status === 'inactive';

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.rowTop}>
        <View style={styles.labelGroup}>
          <Text style={styles.label}>Total balance</Text>
          <View style={styles.statusDotRow}>
            <View
              style={[
                styles.statusDot,
                isBlocked
                  ? styles.dotBlocked
                  : isInactive
                  ? styles.dotInactive
                  : styles.dotActive,
              ]}
            />
            <Text style={styles.statusText}>
              {isBlocked ? 'Blocked' : isInactive ? 'Inactive' : 'Active Account'}
            </Text>
          </View>
        </View>
      </View>

      {/* Balance Center Amount + Adjacent Eye Toggle */}
      <ToggleableBalance
        value={account?.balance ?? 0}
        size="xl"
        color={colors.textOnPrimary}
        iconColor={colors.textOnPrimary}
        iconSize={20}
        buttonSize={36}
        buttonStyle={styles.eyeBtn}
        buttonPressedStyle={styles.eyeBtnPressed}
        style={styles.balanceSection}
        hidden={hidden}
        onToggleHide={onToggleHide}
      />

      {/* Bottom Row */}
      <View style={styles.rowBottom}>
        <View style={styles.accountInfo}>
          <Text style={styles.accountLabel}>Smart Savings</Text>
          <Text style={styles.accountNumber} numberOfLines={1}>
            •••• {account?.account_number ? account.account_number.slice(-4) : '••••'}
            {account?.branch?.name ? ` • ${account.branch.name}` : ''}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage accounts"
          onPress={() => router.push(ROUTES.account)}
          style={({ pressed }) => [styles.pillButton, pressed && styles.pillPressed]}
        >
          <Text style={styles.pillText}>Details</Text>
          <Icon name="chevron-right" size={14} color={colors.textOnPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl, // 20pt
    padding: spacing.lg,
    minHeight: 184,
    justifyContent: 'space-between',
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.textOnPrimary,
    opacity: 0.85,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  dotActive: { backgroundColor: '#4ADE80' },
  dotInactive: { backgroundColor: '#FBBF24' },
  dotBlocked: { backgroundColor: '#F87171' },
  statusText: {
    color: colors.textOnPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  eyeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  eyeBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  balanceSection: {
    marginVertical: spacing.md,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  accountInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  accountLabel: {
    color: colors.textOnPrimary,
    opacity: 0.75,
    fontSize: 12,
    fontWeight: '500',
  },
  accountNumber: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.pill,
    gap: 4,
  },
  pillPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  pillText: {
    color: colors.textOnPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});
