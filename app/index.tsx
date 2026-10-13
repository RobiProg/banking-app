import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { ScreenContainer } from '../components/auth/ScreenContainer';
import { colors } from '../constants/colors';
import { spacing, typography } from '../constants/layout';
import { ROUTES } from '../constants/routes';
import { getSessionWithProfile } from '../services/auth';

const MIN_VISIBLE_MS = 2000;
const APP_VERSION = '1.0.0';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // ignore — older Expo Go builds ignore this call.
});

/**
 * Splash / route-by-role screen.
 *   1. Wait at least MIN_VISIBLE_MS.
 *   2. Check the session.
 *   3. If signed in, load the profile and route by role.
 *      - admins → /(admin)
 *      - customers → /(customer)
 *   4. If signed out → /(auth)/login.
 */
export default function SplashScreen() {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function decideRoute() {
      const lookup = await getSessionWithProfile();
      const elapsed = Date.now() - startedAtRef.current;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

      timeoutRef.current = setTimeout(async () => {
        if (cancelled) return;
        try {
          await ExpoSplashScreen.hideAsync();
        } catch {
          // ignore — splash module may not be available in Expo Go sandbox.
        }
        if (!lookup.user) {
          router.replace(ROUTES.login);
          return;
        }
        if (!lookup.profile) {
          // Profile row missing or query failed — send to login so they
          // can try again. The error message will appear in the next
          // screen via the (customer)/_layout.tsx gate.
          router.replace(ROUTES.login);
          return;
        }
        if (lookup.profile.role === 'admin') {
          router.replace(ROUTES.adminDashboard);
        } else {
          router.replace(ROUTES.customer);
        }
      }, wait);
    }

    decideRoute();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [router]);

  return (
    <ScreenContainer scrollable={false} centered>
      <View style={styles.fill}>
        <View style={styles.center}>
          <View style={styles.card} accessible accessibilityRole="image">
            <View style={styles.logoPlate}>
              <Text style={styles.logoMarkText}>SB</Text>
            </View>
          </View>
          <Text style={styles.appName}>SmartBank</Text>
          <Text style={styles.tagline}>Secure digital banking</Text>
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </View>
        <Text style={styles.versionTag}>v{APP_VERSION}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoPlate: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  logoMarkText: {
    color: colors.textOnPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appName: {
    fontSize: typography.title.size + 4,
    fontWeight: typography.title.weight,
    color: colors.text,
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: typography.subtitle.size,
    color: colors.textMuted,
    opacity: 0.85,
  },
  loaderWrap: {
    marginTop: spacing.xl + spacing.xs,
    marginBottom: spacing.lg,
  },
  versionTag: {
    color: colors.textMuted,
    fontSize: typography.helper.size,
    opacity: 0.7,
    textAlign: 'center',
    paddingBottom: spacing.md,
  },
});