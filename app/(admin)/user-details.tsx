import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Card } from '../../components/common/Card';
import { Money } from '../../components/common/Money';
import { StatusPill } from '../../components/admin/AccountRow';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { getUserById, type AdminUserRow } from '../../services/admin';
import { initialsFromName } from '../../utils/format';

/**
 * Admin user detail screen — shows full profile + their account info.
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
        <LoadingState label="Loading user…" />
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
      <ScreenHeader title="User detail" subtitle={user.email ?? '—'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarMark}>{initialsFromName(user.full_name)}</Text>
          </View>
          <Text style={styles.name}>{user.full_name}</Text>
          <Text style={styles.role}>{user.role === 'admin' ? 'Administrator' : 'Customer'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Card>
            <InfoRow label="Email" value={user.email ?? '—'} />
            <Divider />
            <InfoRow label="Phone" value={user.phone ?? '—'} />
            <Divider />
            <InfoRow label="Role" value={user.role === 'admin' ? 'Administrator' : 'Customer'} />
            <Divider />
            <InfoRow
              label="Joined"
              value={new Date(user.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            />
          </Card>
        </View>

        {user.account_number ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Card>
              <InfoRow label="Account number" value={user.account_number} />
              <Divider />
              <View style={styles.statusRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <StatusPill status={user.account_status ?? 'active'} />
              </View>
              <Divider />
              <View style={styles.balanceRow}>
                <Text style={styles.infoLabel}>Balance</Text>
                <Money value={user.balance} size="medium" />
              </View>
            </Card>
            <Text style={styles.helper}>
              To change status or view full balance, open the Accounts tab.
            </Text>
          </View>
        ) : null}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  hero: { alignItems: 'center', paddingVertical: spacing.md },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMark: { color: colors.primaryDark, fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  role: { fontSize: typography.body.size, color: colors.textMuted, marginTop: 2 },
  section: { marginTop: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  infoLabel: { fontSize: typography.body.size, color: colors.textMuted },
  infoValue: { fontSize: typography.body.size, color: colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  divider: { height: 1, backgroundColor: colors.border },
  helper: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: spacing.sm },
});