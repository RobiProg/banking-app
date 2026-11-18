import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Money } from '../../components/common/Money';
import { colors } from '../../constants/colors';
import { radius, spacing, typography } from '../../constants/layout';
import { getUserById, type AdminUserRow } from '../../services/admin';

/**
 * Admin Customer Details Screen.
 * Deep audit view aligned with SmartBank Figma UI tokens.
 */
export default function AdminUserDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setError('User not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserById(id)
      .then((res) => {
        if (cancelled) return;
        if (res.errorMessage) setError(res.errorMessage);
        else setUser(res.user);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading customer details…" />
      </ScreenContainer>
    );
  }
  if (error || !user) {
    return (
      <ScreenContainer scrollable={false} centered>
        <ErrorState
          title="User unavailable"
          message={error ?? 'User not found.'}
          onRetry={() => router.back()}
          retryLabel="Go back"
        />
      </ScreenContainer>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Customer Audit" subtitle={user.email ?? '—'} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Customer Avatar & Role Header */}
        <View style={styles.hero}>
          <Avatar name={user.full_name} size={72} />
          <Text style={styles.name}>{user.full_name}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={user.role === 'admin' ? 'ADMINISTRATOR' : 'CUSTOMER'}
              variant={user.role === 'admin' ? 'primary' : 'neutral'}
            />
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Card variant="surface" style={styles.card}>
            <InfoRow label="Email" value={user.email ?? '—'} />
            <Divider />
            <InfoRow label="Phone Number" value={user.phone ?? '—'} />
            <Divider />
            <InfoRow label="Access Role" value={user.role === 'admin' ? 'Administrator / Staff' : 'Retail Customer'} />
            <Divider />
            <InfoRow
              label="Member Since"
              value={new Date(user.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            />
          </Card>
        </View>

        {/* Account Card */}
        {user.account_number ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Account</Text>
            <Card variant="surface" style={styles.card}>
              <InfoRow label="Account Number" value={user.account_number} mono />
              <Divider />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Status</Text>
                <Badge
                  label={(user.account_status ?? 'active').toUpperCase()}
                  variant={
                    user.account_status === 'active'
                      ? 'success'
                      : user.account_status === 'inactive'
                      ? 'warning'
                      : 'error'
                  }
                />
              </View>
              <Divider />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Balance</Text>
                <Money value={user.balance} size="large" />
              </View>
            </Card>
            <Text style={styles.helper}>
              To modify status or post teller deposits, use the Accounts or Cash Deposit tabs.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.monoText]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  badgeRow: {
    marginTop: spacing.xxs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  card: {
    padding: spacing.base,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  monoText: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  helper: {
    fontSize: typography.caption.size,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
