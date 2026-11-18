import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { colors } from '../../../constants/colors';
import { radius, shadows, spacing, typography } from '../../../constants/layout';
import { ROUTES } from '../../../constants/routes';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { StatCard } from '../../../components/admin/StatCard';
import { useProfile } from '../../../hooks/useProfile';
import { getAdminStats, type AdminStats } from '../../../services/admin';
import { signOut } from '../../../services/auth';

/**
 * Admin Dashboard Screen.
 * Visual design aligned with SmartBank Figma Design Specification.
 */
export default function AdminDashboardScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  async function handleConfirmSignOut() {
    setShowSignOutConfirm(false);
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    router.replace(ROUTES.login);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminStats()
      .then((res) => {
        if (cancelled) return;
        if (res.errorMessage) setError(res.errorMessage);
        else setStats(res.stats);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.body}>
          <LoadingState label="Loading bank statistics…" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !stats) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.body}>
          <ErrorState
            title="Could not load statistics"
            message={error ?? 'No stats available.'}
            onRetry={() => {
              setLoading(true);
              setError(null);
              getAdminStats().then((res) => {
                setLoading(false);
                if (res.errorMessage) setError(res.errorMessage);
                else setStats(res.stats);
              });
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Header Row with Avatar & Sign-out */}
        <View style={styles.headerRow}>
          <View style={styles.adminProfileInfo}>
            <Avatar name={profile?.full_name ?? 'Admin Officer'} size={44} />
            <View style={styles.greetingTextGroup}>
              <View style={styles.roleRow}>
                <Text style={styles.title}>Admin Portal</Text>
                <Badge label="Staff / Supervisor" variant="primary" />
              </View>
              <Text style={styles.subtitle}>
                {profile?.full_name ? `Welcome back, ${profile.full_name}` : 'Overview & Operations'}
              </Text>
            </View>
          </View>

          <Button
            title="Sign out"
            variant="outline"
            size="sm"
            icon="logout"
            onPress={() => setShowSignOutConfirm(true)}
          />
        </View>

        {/* Big-number Stats Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>System Statistics</Text>
          <Text style={styles.sectionSubtitle}>Live bank metrics from PostgreSQL</Text>
        </View>

        <View style={styles.grid}>
          <StatCard label="Total Users" value={stats.totalUsers} icon="users" />
          <StatCard label="Total Accounts" value={stats.totalAccounts} icon="card" />
          <StatCard label="Active Accounts" value={stats.activeAccounts} icon="check-circle" />
          <StatCard label="Total Transactions" value={stats.totalTransactions} icon="document" />
          <StatCard label="Branch Network" value={stats.totalBranches ?? 0} icon="bank" />
        </View>

        {/* Staff Operator Quick Actions */}
        <View style={styles.quickSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Counter & Branch Actions</Text>
            <Text style={styles.sectionSubtitle}>Operational tools for tellers and supervisors</Text>
          </View>

          <View style={styles.quickRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Record branch cash deposit"
              onPress={() => router.push(ROUTES.adminDeposit)}
              style={({ pressed }) => [styles.quickCard, styles.quickCardPrimary, pressed && styles.pressed]}
            >
              <View style={styles.actionIconCircle}>
                <Icon name="deposit" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickCardTitle}>Branch Cash Counter Deposit</Text>
                <Text style={styles.quickCardDesc}>Accept physical currency and credit customer account (FR-DEP-01)</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.primary} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage branch network"
              onPress={() => router.push(ROUTES.adminBranches)}
              style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
            >
              <View style={styles.actionIconCircle}>
                <Icon name="bank" size={24} color={colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickCardTitle}>Branch Network Management</Text>
                <Text style={styles.quickCardDesc}>Provision and audit 8+ Bangladesh regional branches (FR-ADM-06)</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <Card variant="surface" style={styles.guidanceCard}>
          <View style={styles.guidanceRow}>
            <Icon name="info" size={18} color={colors.primary} />
            <Text style={styles.guidanceText}>
              Audit-trail enforcement: Account activations, blocks, and cash deposits are logged to audit tables with operator UUIDs.
            </Text>
          </View>
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Sign out of Admin Portal?"
        message="You will need to sign in again to access administrative features."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        loading={signingOut}
        onConfirm={handleConfirmSignOut}
        onCancel={() => (signingOut ? null : setShowSignOutConfirm(false))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  adminProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  greetingTextGroup: {
    flex: 1,
    gap: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  quickSection: {
    gap: spacing.md,
  },
  quickRow: {
    gap: spacing.md,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.base,
    ...shadows.sm,
  },
  quickCardPrimary: {
    borderColor: 'rgba(10, 107, 211, 0.3)',
    backgroundColor: '#F9FBFF',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickCardDesc: {
    fontSize: typography.caption.size,
    color: colors.textSecondary,
    marginTop: 2,
  },
  guidanceCard: {
    padding: spacing.base,
    borderRadius: radius.md,
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  guidanceText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
