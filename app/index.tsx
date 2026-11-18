import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SplashScreen as RouterSplashScreen, useRouter } from 'expo-router';
import { Icon } from '../components/ui/Icon';
import { colors, SPLASH_GRADIENT } from '../constants/colors';
import { spacing } from '../constants/layout';
import { ROUTES } from '../constants/routes';
import { getSessionWithProfile } from '../services/auth';

const MIN_VISIBLE_MS = 2200;

RouterSplashScreen.preventAutoHideAsync().catch(() => {
  // ignore
});

/**
 * SmartBank Splash & Launch Screen.
 *
 * Implements the Figma mobile banking design system:
 * - Brand Corporate Blue gradient matching project palette (#062A54 -> #08488E -> #0A6BD3)
 * - Concentric curved background lines for depth
 * - Centered squircle logo lockup: "S" mark + "SmartBank" wordmark
 * - Center fintech growth chart hero with pill bars and glowing amber accent coin
 * - High-contrast typography: "Banking Made Simple." + subtitle
 * - Floating circular CTA button (chevron right) for instant progression
 * - Shielded "EDUCATIONAL BANKING SIMULATION" footer
 * - Route gate directing to (auth)/login, (customer), or (admin) based on session
 */
export default function SplashScreen() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false);
  const resolvedTargetRef = useRef<string | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);

  // Entrance and looping animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const bar1Scale = useRef(new Animated.Value(0.15)).current;
  const bar2Scale = useRef(new Animated.Value(0.15)).current;
  const bar3Scale = useRef(new Animated.Value(0.15)).current;
  const coinFloat = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const navigateToDestination = useCallback((target?: string) => {
    if (hasNavigatedRef.current) return;
    const dest = target || resolvedTargetRef.current;
    if (!dest) return;

    hasNavigatedRef.current = true;
    RouterSplashScreen.hideAsync().catch(() => {});
    router.replace(dest as any);
  }, [router]);

  useEffect(() => {
    let isCancelled = false;
    const startTime = Date.now();

    // 1. Staggered entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(120, [
        Animated.spring(bar1Scale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.spring(bar2Scale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.spring(bar3Scale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: MIN_VISIBLE_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    // 2. Looping ambient animations for coin float & CTA button pulse
    const coinAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(coinFloat, {
          toValue: -5,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(coinFloat, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    coinAnimation.start();

    const buttonAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.04,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    buttonAnimation.start();

    // 3. Resolve authentication & session
    async function checkAuthAndSchedule() {
      try {
        const lookup = await getSessionWithProfile();
        let targetRoute: string = ROUTES.login;

        if (lookup.user && lookup.profile) {
          if (lookup.profile.role === 'admin' || lookup.profile.role === 'teller') {
            targetRoute = ROUTES.adminDashboard;
          } else {
            targetRoute = ROUTES.customer;
          }
        }

        resolvedTargetRef.current = targetRoute;
        if (!isCancelled) {
          setIsAuthResolved(true);
        }

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

        setTimeout(() => {
          if (!isCancelled) {
            navigateToDestination(targetRoute);
          }
        }, remaining);
      } catch {
        resolvedTargetRef.current = ROUTES.login;
        if (!isCancelled) {
          setIsAuthResolved(true);
          navigateToDestination(ROUTES.login);
        }
      }
    }

    checkAuthAndSchedule();

    return () => {
      isCancelled = true;
      coinAnimation.stop();
      buttonAnimation.stop();
    };
  }, [
    fadeAnim,
    slideAnim,
    bar1Scale,
    bar2Scale,
    bar3Scale,
    coinFloat,
    buttonPulse,
    progressAnim,
    navigateToDestination,
  ]);

  const handleCtaPress = () => {
    if (resolvedTargetRef.current) {
      navigateToDestination(resolvedTargetRef.current);
    } else {
      // If still resolving auth, route to login fallback immediately
      navigateToDestination(ROUTES.login);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Corporate Blue Palette Gradient */}
      <LinearGradient
        colors={SPLASH_GRADIENT}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative concentric background curves from Figma */}
      <View style={styles.backgroundDecor} pointerEvents="none">
        <View style={[styles.decorCircle, styles.circleTopRightOuter]} />
        <View style={[styles.decorCircle, styles.circleTopRightInner]} />
        <View style={[styles.decorCircle, styles.circleBottomLeftOuter]} />
        <View style={[styles.decorCircle, styles.circleBottomLeftInner]} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Logo Lockup: Rounded squircle "S" + "SmartBank" wordmark */}
          <View style={styles.headerLockup}>
            <View style={styles.logoBadge} accessible accessibilityRole="image">
              <Text style={styles.logoBadgeText}>S</Text>
            </View>
            <Text style={styles.wordmark}>SmartBank</Text>
          </View>

          {/* Center Graphic & Value Proposition */}
          <View style={styles.centerSection}>
            {/* Fintech Growth Hero Plate */}
            <View style={styles.heroPlateWrap}>
              <View style={styles.heroPlate}>
                {/* Ascending pill bar chart */}
                <View style={styles.barsContainer}>
                  <Animated.View
                    style={[
                      styles.chartBar,
                      styles.barLeft,
                      { transform: [{ scaleY: bar1Scale }] },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.chartBar,
                      styles.barMiddle,
                      { transform: [{ scaleY: bar2Scale }] },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.chartBar,
                      styles.barRight,
                      { transform: [{ scaleY: bar3Scale }] },
                    ]}
                  />
                </View>
              </View>

              {/* Floating golden accent coin / orb */}
              <Animated.View
                style={[
                  styles.coinWrapper,
                  { transform: [{ translateY: coinFloat }] },
                ]}
              >
                <View style={styles.coinHalo}>
                  <View style={styles.coinCore} />
                </View>
              </Animated.View>
            </View>

            {/* Typography */}
            <Text style={styles.headline}>Banking Made Simple.</Text>
            <Text style={styles.subtitle}>
              A smarter way to learn modern banking.
            </Text>

            {/* Subtle animated loading line */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressBar, { width: progressWidth }]}
              />
            </View>
          </View>

          {/* Bottom Area: Circular Next Button + Footer simulation tag */}
          <View style={styles.bottomSection}>
            <Animated.View
              style={[
                styles.ctaWrap,
                { transform: [{ scale: buttonPulse }] },
              ]}
            >
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleCtaPress}
                activeOpacity={0.85}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Get Started"
              >
                {/* Pixel-perfect right chevron vector */}
                <View style={styles.chevron} />
              </TouchableOpacity>
            </Animated.View>

            {/* Educational Simulation Footer */}
            <View style={styles.footerRow}>
              <Icon
                name="shield"
                size={14}
                color="rgba(255, 255, 255, 0.75)"
                style={styles.footerShield}
              />
              <Text style={styles.footerText}>
                EDUCATIONAL BANKING SIMULATION
              </Text>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#062A54',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },

  /* Decorative Background Circles */
  backgroundDecor: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 9999,
  },
  circleTopRightOuter: {
    width: 380,
    height: 380,
    top: -100,
    right: -120,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  circleTopRightInner: {
    width: 250,
    height: 250,
    top: -40,
    right: -60,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  circleBottomLeftOuter: {
    width: 380,
    height: 380,
    bottom: 50,
    left: -130,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  circleBottomLeftInner: {
    width: 240,
    height: 240,
    bottom: 120,
    left: -60,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },

  /* Header Logo Lockup */
  headerLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'android' ? spacing.lg : spacing.md,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
    }),
  },
  logoBadgeText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    includeFontPadding: false,
    lineHeight: 30,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginLeft: 14,
  },

  /* Center Section */
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },

  /* Hero Growth Plate */
  heroPlateWrap: {
    width: 176,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.lg,
  },
  heroPlate: {
    width: 176,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 22,
    overflow: 'hidden',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 120,
  },
  chartBar: {
    width: 24,
    borderRadius: 12,
  },
  barLeft: {
    height: 52,
    backgroundColor: colors.primaryMuted, // #B3D4F9
  },
  barMiddle: {
    height: 84,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
  },
  barRight: {
    height: 116,
    backgroundColor: colors.splashAccentCyan, // #38BDF8
  },

  /* Floating Amber Coin */
  coinWrapper: {
    position: 'absolute',
    top: -6,
    right: 22,
    zIndex: 10,
  },
  coinHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.splashAccentAmber, // #F59E0B
  },

  /* Typography */
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.82)',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 24,
    maxWidth: 290,
  },

  /* Sleek Loading Line */
  progressTrack: {
    width: 64,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginTop: spacing.xl,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.splashAccentCyan,
    borderRadius: 1.5,
  },

  /* Bottom Section */
  bottomSection: {
    paddingBottom: spacing.sm,
  },
  ctaWrap: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  ctaButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
    }),
  },
  chevron: {
    width: 12,
    height: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
    transform: [{ rotate: '45deg' }],
    marginLeft: -4,
  },

  /* Footer Tag */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerShield: {
    marginRight: 6,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1.2,
  },
});
