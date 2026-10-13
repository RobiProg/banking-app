import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { ROUTES, adminUserDetailsPath } from '../../../constants/routes';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { AuthInput } from '../../../components/auth/AuthInput';
import { UserRow } from '../../../components/admin/UserRow';
import { listUsers, type AdminUserRow } from '../../../services/admin';

/**
 * Admin users tab (Phase 15).
 * Searchable list of users. Tap → user detail (basic info + account).
 */
export default function AdminUsersTab() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const reload = useCallback(async (q = query) => {
    setLoading(true);
    setError(null);
    const res = await listUsers(q);
    setLoading(false);
    if (res.errorMessage) setError(res.errorMessage);
    else setUsers(res.users);
  }, [query]);

  useEffect(() => {
    reload('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${users.length} ${users.length === 1 ? 'user' : 'users'}`}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <AuthInput
          label=""
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            reload(t);
          }}
          placeholder="Search by name, email or phone"
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {loading ? (
        <View style={styles.body}>
          <LoadingState label="Loading users…" />
        </View>
      ) : error ? (
        <View style={styles.body}>
          <ErrorState
            title="Could not load users"
            message={error}
            onRetry={() => reload()}
          />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No users found"
            message={
              query
                ? `No users match "${query}".`
                : 'When new customers register, they will appear here.'
            }
          />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <UserRow
              fullName={item.full_name}
              email={item.email}
              role={item.role}
              accountNumber={item.account_number}
              accountStatus={item.account_status}
              onPress={() => router.push(adminUserDetailsPath(item.id) as never)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 2 },
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: { paddingBottom: spacing.xl },
});