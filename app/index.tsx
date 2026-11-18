import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SplashScreen as RouterSplashScreen, useRouter } from 'expo-router';
import { ScreenContainer } from '../components/auth/ScreenContainer';
import { Icon } from '../components/ui/Icon';
import { colors } from '../constants/colors';
import { radius, spacing, typography } from '../constants/layout';
import { ROUTES } from '../constants/routes';
import { getSessionWithProfile } from '../services/auth';

const MIN_VISIBLE_MS = 1800;
const APP_VERSION = '1.0.0';

RouterSplashScreen.preventAutoHideAsync().catch(() => {
  // ignore
});

/**
 * Splash / route-by-role screen. Matches Figma §1.
 * Centered logo lockup with shield icon + "SmartBank" wordmark,
 * indeterminate loader, and automatic route redirection.
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
          await RouterSplashScreen.hideAsync();
        } catch {
          // ignore
        }
        if (!lookup.user || !lookup.profile) {
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
          {/* Logo Lockup: 32x32 shield icon + SmartBank Wordmark */}
          <View style={styles.logoLockup} accessible accessibilityRole="image">
            <View style={styles.shieldPlate}>
              <Icon name="shield" size={24} color={colors.primary} />
            </View>
            <Text style={styles.wordmark}>SmartBank</Text>
          </View>
          <Text style={styles.tagline}>Modern digital banking</Text>

          {/* Indeterminate linear loading indicator */}
          <View style={styles.loaderWrap}>
            <View style={styles.linearTrack}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        </View>

        <Text style={styles.versionTag}>v{APP_VERSION} • Educational Banking Simulation</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  shieldPlate: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  wordmark: {
    fontSize: 28, // Figma specification: Inter 700, 28pt
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.subtitle.size,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  loaderWrap: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  linearTrack: {
    width: 48,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionTag: {
    color: colors.textTertiary,
    fontSize: typography.helper.size,
    textAlign: 'center',
    paddingBottom: spacing.base,
  },
});
