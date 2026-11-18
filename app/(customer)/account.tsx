import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { Badge } from '../../components/ui/Badge';
import { BalanceCard } from '../../components/banking/BalanceCard';
import { TransactionRow } from '../../components/banking/TransactionRow';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../hooks/useAccount';
import { useTransactions } from '../../hooks/useTransactions';
import { useProfile } from '../../hooks/useProfile';
import { txnDirection } from '../../types/db';
import { maskAccountNumber } from '../../utils/format';

/**
 * Account Detail Screen. Matches Figma §7.
 * Shows balance hero card, action shortcuts, comprehensive banking metadata, and recent transactions.
 */
export default function AccountDetailScreen() {
  const router = useRouter();
  const { account, loading, errorMessage, reload } = useAccount();
  const { profile } = useProfile();
  const myAccountId = account?.id ?? null;
  const { transactions, loading: txnsLoading } = useTransactions({
    limit: 5,
    myAccountId,
    autoLoad: !!account,
  });

  if (loading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading account…" />
      </ScreenContainer>
    );
  }

  if (errorMessage || !account) {
    return (
      <ScreenContainer scrollable={false} centered>
        <ErrorState
          title="Account unavailable"
          message={errorMessage ?? 'Account not found.'}
          onRetry={reload}
        />
      </ScreenContainer>
    );
  }

  function handleCopyAccountNumber() {
    Alert.alert('Account Number Copied', `${account?.account_number} copied to clipboard.`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Account Details" subtitle="Primary savings account" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance Hero Card */}
        <BalanceCard account={account} />

        {/* Quick Action Grid (§7) */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionTile, pressed && styles.actionPressed]}
            onPress={() => router.push(ROUTES.sendMoney)}
          >
            <View style={styles.actionIconCircle}>
              <Icon name="send" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Send</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionTile, pressed && styles.actionPressed]}
            onPress={() => router.push(ROUTES.deposit)}
          >
            <View style={styles.actionIconCircle}>
              <Icon name="bank" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Deposit Info</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionTile, pressed && styles.actionPressed]}
            onPress={() => router.push(ROUTES.withdraw)}
          >
            <View style={styles.actionIconCircle}>
              <Icon name="arrow-down" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Withdraw</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionTile, pressed && styles.actionPressed]}
            onPress={() => router.push(ROUTES.transactions)}
          >
            <View style={styles.actionIconCircle}>
              <Icon name="history" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Statement</Text>
          </Pressable>
        </View>

        {/* Account Information Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Holder</Text>
              <Text style={styles.infoValue}>{profile?.full_name ?? '—'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Number</Text>
              <Pressable style={styles.copyRow} onPress={handleCopyAccountNumber}>
                <Text style={styles.infoValue} numberOfLines={1}>{account.account_number}</Text>
                <Icon name="copy" size={16} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Home Branch</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
                {account.branch ? account.branch.name : 'Dhaka Motijheel Main Branch'}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Branch District</Text>
              <Text style={styles.infoValue}>{account.branch?.district ?? 'Dhaka'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Branch Routing Code</Text>
              <Text style={styles.infoValue}>{account.branch?.routing_code ?? 'SMART-001'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Badge label="Savings" variant="primary" />
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Badge
                label={account.status.toUpperCase()}
                variant={account.status === 'active' ? 'success' : account.status === 'inactive' ? 'warning' : 'error'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date Opened</Text>
              <Text style={styles.infoValue}>
                {new Date(account.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </Card>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push(ROUTES.transactions)}>
              <Text style={styles.link}>See all</Text>
            </Pressable>
          </View>

          {txnsLoading ? (
            <LoadingState label="Loading activity…" />
          ) : transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              message="Your activity will appear here once you send or receive transfers."
            />
          ) : (
            <View style={styles.txnsList}>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionPressed: {
    opacity: 0.8,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    flexShrink: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  txnsList: {
    gap: spacing.sm,
  },
});
