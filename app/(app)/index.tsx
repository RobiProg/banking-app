import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuthButton } from '../../components/auth/AuthButton';
import { colors } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { getCurrentUser, signOut } from '../../services/auth';

/**
 * Placeholder home screen for authenticated users.
 *
 * Replaced by the real customer dashboard in Phase 7. For now it just
 * confirms auth works and exposes Logout.
 */
export default function PlaceholderHomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        setEmail(user?.email ?? null);
        setReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const { errorMessage } = await signOut();
    setLoggingOut(false);
    if (errorMessage) {
      // eslint-disable-next-line no-console
      console.warn('[logout]', errorMessage);
    }
    router.replace(ROUTES.login);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>SB</Text>
          </View>
          <Text style={styles.title}>Welcome to SmartBank</Text>
          {ready ? (
            <Text style={styles.subtitle}>
              Signed in as {email ?? 'your account'}
            </Text>
          ) : (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          )}
        </View>

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Dashboard coming soon</Text>
          <Text style={styles.placeholderBody}>
            Balance, quick actions and transaction history will appear here in
            the next phase. You're successfully authenticated.
          </Text>
        </View>

        <AuthButton
          title="Logout"
          onPress={handleLogout}
          loading={loggingOut}
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoMarkText: {
    color: colors.textOnPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  spinner: {
    marginTop: 8,
  },
  placeholderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  placeholderBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
});