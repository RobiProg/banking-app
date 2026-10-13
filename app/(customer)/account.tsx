import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Card } from '../../components/common/Card';
import { Money } from '../../components/common/Money';
import { BalanceCard } from '../../components/banking/BalanceCard';
import { TransactionRow } from '../../components/banking/TransactionRow';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { useAccount } from '../../hooks/useAccount';
import { useTransactions } from '../../hooks/useTransactions';
import { useProfile } from '../../hooks/useProfile';
import { txnDirection } from '../../types/db';
import { maskAccountNumber } from '../../utils/format';
import { useRouter } from 'expo-router';
import { ROUTES } from '../../constants/routes';

/**
 * Account detail screen (Phase 7).
 * Shows masked number, status pill, holder info, recent 5 txns.
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Account" subtitle="Manage your savings account." />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BalanceCard account={account} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account information</Text>
          <Card>
            <InfoRow label="Account holder" value={profile?.full_name ?? '—'} />
            <Divider />
            <InfoRow label="Account number" value={maskAccountNumber(account.account_number)} />
            <Divider />
            <InfoRow label="Account type" value={capitalise(account.account_type)} />
            <Divider />
            <InfoRow label="Status" value={capitalise(account.status)} />
            <Divider />
            <InfoRow
              label="Opened"
              value={new Date(account.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent transactions</Text>
            <Text
              accessibilityRole="link"
              style={styles.link}
              onPress={() => router.push(ROUTES.transactions)}
            >
              See all
            </Text>
          </View>

          {txnsLoading ? (
            <LoadingState label="Loading…" />
          ) : transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              message="Once you make a deposit or transfer, your activity will appear here."
            />
          ) : (
            transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                direction={txnDirection(t, myAccountId)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function capitalise(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
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
  link: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: typography.body.size,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  infoLabel: {
    fontSize: typography.body.size,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: typography.body.size,
    color: colors.text,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});