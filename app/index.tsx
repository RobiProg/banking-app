import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { ScreenContainer } from '../components/auth/ScreenContainer';
import { colors } from '../constants/colors';
import { spacing, typography } from '../constants/layout';
import { ROUTES } from '../constants/routes';
import { getSession } from '../services/auth';

const MIN_VISIBLE_MS = 2000;
const APP_VERSION = '1.0.0';

// Keep the native splash on screen until we explicitly hide it. Without
// this, the native splash can disappear before our JS splash mounts.
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Safe to ignore — older Expo Go builds ignore this call.
});

export default function SplashScreen() {
  const router = useRouter();
  const startedAtRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function decideRoute() {
      const session = await getSession();
      const elapsed = Date.now() - startedAtRef.current;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

      timeoutRef.current = setTimeout(async () => {
        if (cancelled) return;
        // Hand control from the native splash to our JS splash.
        try {
          await ExpoSplashScreen.hideAsync();
        } catch {
          // ignore — splash module may not be available in Expo Go sandbox.
        }
        router.replace(session ? ROUTES.app : ROUTES.login);
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
  fill: {
    flex: 1,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    fontSize: typography.title.size + 4, // 32
    fontWeight: typography.title.weight,
    color: colors.text,
    marginBottom: spacing.xs + 2, // 6
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: typography.subtitle.size,
    color: colors.textMuted,
    opacity: 0.85,
  },
  loaderWrap: {
    marginTop: spacing.xl + spacing.xs, // 36
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