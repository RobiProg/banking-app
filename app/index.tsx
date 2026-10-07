import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/colors';
import { ROUTES } from '../constants/routes';
import { getSession } from '../services/auth';

const MIN_VISIBLE_MS = 800;

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

      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
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
    <View style={styles.container}>
      <View style={styles.logoMark}>
        <Text style={styles.logoMarkText}>SB</Text>
      </View>
      <Text style={styles.appName}>SmartBank</Text>
      <Text style={styles.tagline}>Secure digital banking</Text>
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoMarkText: {
    color: colors.textOnPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
  },
  loaderWrap: {
    marginTop: 36,
  },
});