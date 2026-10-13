import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
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
import { useProfile } from '../../../hooks/useProfile';
import { useTransactions } from '../../../hooks/useTransactions';
import { txnDirection } from '../../../types/db';

/**
 * Customer dashboard (Phase 7).
 * Greeting + BalanceCard + QuickActions + AccountCard + Recent transactions.
 */
export default function CustomerHomeScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { account, loading: acctLoading, errorMessage: acctErr, reload: reloadAcct } = useAccount();
  const myAccountId = account?.id ?? null;
  const { transactions, loading: txnsLoading } = useTransactions({
    limit: 5,
    myAccountId,
    autoLoad: !!account,
  });

  const [hidden, setHidden] = useState(false);

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
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greetingText}</Text>
            <Text style={styles.subgreeting}>Here is your account overview.</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarMark}>{initials(profile?.full_name)}</Text>
          </View>
        </View>

        <BalanceCard
          account={account}
          hidden={hidden}
          onToggleHide={() => setHidden((h) => !h)}
        />

        <View style={styles.section}>
          <QuickActions />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My account</Text>
          </View>
          <AccountCard account={account} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent transactions</Text>
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
              message="Send or receive transfers to see your banking activity here."
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

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subgreeting: {
    fontSize: typography.subtitle.size,
    color: colors.textMuted,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMark: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: typography.body.size,
  },
});