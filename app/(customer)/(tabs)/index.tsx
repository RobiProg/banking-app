import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import { colors } from '../../../constants/colors';
import { radius, spacing } from '../../../constants/layout';
import { ROUTES } from '../../../constants/routes';
import { ScreenContainer } from '../../../components/auth/ScreenContainer';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { BalanceCard } from '../../../components/banking/BalanceCard';
import { QuickActions } from '../../../components/banking/QuickActions';
import { AccountCard } from '../../../components/banking/AccountCard';
import { TransactionRow } from '../../../components/banking/TransactionRow';
import { useAccount } from '../../../hooks/useAccount';
import { useNotifications } from '../../../hooks/useNotifications';
import { useProfile } from '../../../hooks/useProfile';
import { useTransactions } from '../../../hooks/useTransactions';
import { txnDirection } from '../../../types/db';

/**
 * Customer Dashboard Screen. Matches Figma §5.
 * Top bar with avatar, greeting, notification bell & QR pay;
 * Hero balance card, 4-action grid, account summary, and recent activity.
 */
export default function CustomerHomeScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { account, loading: acctLoading, errorMessage: acctErr, reload: reloadAcct } = useAccount();
  const { unreadCount } = useNotifications();
  const myAccountId = account?.id ?? null;
  const { transactions, loading: txnsLoading } = useTransactions({
    limit: 5,
    myAccountId,
    autoLoad: !!account,
  });

  if (acctLoading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading your account…" />
      </ScreenContainer>
    );
  }

  if (acctErr || !account) {
    return (
      <ScreenContainer scrollable={false} centered>
        <ErrorState
          title="Account unavailable"
          message={acctErr ?? 'We could not find your account.'}
          onRetry={reloadAcct}
        />
      </ScreenContainer>
    );
  }

  const greetingText = buildGreeting(profile?.full_name ?? 'there');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar (§5) */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View profile"
            onPress={() => router.push(ROUTES.profile)}
            style={styles.profileTrigger}
          >
            <Avatar name={profile?.full_name} size={42} verified />
            <View style={styles.greetingGroup}>
              <Text style={styles.greeting}>{greetingText}</Text>
              <Text style={styles.subgreeting}>Welcome back to SmartBank</Text>
            </View>
          </Pressable>

          <View style={styles.topRightActions}>
            {/* Notifications Button with unread indicator */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
              onPress={() => router.push(ROUTES.notifications)}
              hitSlop={8}
              style={styles.iconButton}
            >
              <Icon name="bell" size={20} color={colors.textPrimary} />
              {unreadCount > 0 && <View style={styles.unreadDot} />}
            </Pressable>

            {/* Simulated QR Action Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan QR code"
              onPress={() =>
                Alert.alert(
                  'SmartBank QR Scanner',
                  'Simulated camera scanner for instant P2P payments and branch counter check-in.',
                  [{ text: 'Close' }]
                )
              }
              hitSlop={8}
              style={styles.iconButton}
            >
              <Icon name="qr" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Hero Balance Card */}
        <BalanceCard account={account} />

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <QuickActions />
        </View>

        {/* My Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My account</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.account)}
              hitSlop={8}
            >
              <Text style={styles.linkText}>View details</Text>
            </Pressable>
          </View>
          <AccountCard account={account} />
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.transactions)}
              hitSlop={8}
            >
              <Text style={styles.linkText}>See all</Text>
            </Pressable>
          </View>

          {txnsLoading ? (
            <LoadingState label="Loading transactions…" />
          ) : transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              message="Send money or make a branch deposit to see your banking history."
              ctaLabel="Send money"
              onPressCta={() => router.push(ROUTES.sendMoney)}
            />
          ) : (
            <View>
              {transactions.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  direction={txnDirection(t, myAccountId)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildGreeting(name: string): string {
  const hour = new Date().getHours();
  const part =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name.split(' ')[0]}`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  profileTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  greetingGroup: {
    marginLeft: spacing.md,
  },
  greeting: {
    fontSize: 18, // Figma specification: 18 pt weight 600
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subgreeting: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8, // Figma specification: 8 pt dot
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  section: {
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18, // Figma specification: 18 pt weight 600
    fontWeight: '600',
    color: colors.textPrimary,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
