import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { ROUTES } from '../../../constants/routes';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { StatCard } from '../../../components/admin/StatCard';
import { useProfile } from '../../../hooks/useProfile';
import { getAdminStats, type AdminStats } from '../../../services/admin';
import { signOut } from '../../../services/auth';

/**
 * Admin dashboard (Phase 14).
 * Shows 4 simple stat cards. Plan says "Keep statistics simple."
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
          <LoadingState label="Loading statistics…" />
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Admin dashboard</Text>
            <Text style={styles.subtitle}>
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => setShowSignOutConfirm(true)}
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
          >
            <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <StatCard label="Total users" value={stats.totalUsers} glyph="◐" />
          <StatCard label="Total accounts" value={stats.totalAccounts} glyph="▤" />
          <StatCard label="Active accounts" value={stats.activeAccounts} glyph="✓" />
          <StatCard label="Total transactions" value={stats.totalTransactions} glyph="≡" />
          <StatCard label="Total branches" value={stats.totalBranches ?? 0} glyph="🏛" />
        </View>

        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>Staff Operator Actions</Text>
          <View style={styles.quickRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Record branch cash deposit"
              onPress={() => router.push(ROUTES.adminDeposit)}
              style={({ pressed }) => [styles.quickCard, styles.quickCardPrimary, pressed && styles.pressed]}
            >
              <Text style={styles.quickIcon}>💵</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickCardTitle}>Branch Cash Deposit</Text>
                <Text style={styles.quickCardDesc}>Record simulated counter cash intake (FR-DEP-01)</Text>
              </View>
              <Text style={styles.quickArrow}>→</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage branches"
              onPress={() => router.push(ROUTES.adminBranches)}
              style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
            >
              <Text style={styles.quickIcon}>🏛</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickCardTitle}>Branch Network</Text>
                <Text style={styles.quickCardDesc}>Manage 8+ Bangladesh regional branches (FR-ADM-06)</Text>
              </View>
              <Text style={styles.quickArrow}>→</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.helper}>
          Use the tabs below to view users, manage account status, and monitor transactions.
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Sign out?"
        message="You will need to sign in again to use SmartBank."
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
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  headerRow: {
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: typography.subtitle.size, color: colors.textMuted, marginTop: 2 },
  signOutBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutText: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.error,
  },
  pressed: { opacity: 0.7 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickSection: {
    gap: spacing.sm,
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  quickRow: {
    gap: spacing.sm,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  quickCardPrimary: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  quickIcon: {
    fontSize: 24,
  },
  quickCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  quickCardDesc: {
    fontSize: typography.caption.size,
    color: colors.textMuted,
    marginTop: 2,
  },
  quickArrow: {
    fontSize: 18,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  helper: { fontSize: typography.helper.size, color: colors.textMuted },
});