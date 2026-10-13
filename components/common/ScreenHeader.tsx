import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightLabel?: string;
  onPressRight?: () => void;
  /** When provided, overrides the default router.back() behaviour. */
  onPressBack?: () => void;
};

/**
 * Standard top bar used by every screen that's not in the tabs.
 * Mirrors the design system spec from DESIGN_PROMPT §2 ("title 24 pt").
 */
export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  rightLabel,
  onPressRight,
  onPressBack,
}: ScreenHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (onPressBack) {
      onPressBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {rightLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightLabel}
            onPress={onPressRight}
            hitSlop={8}
            style={({ pressed }) => [styles.rightBtn, pressed && styles.pressed]}
          >
            <Text style={styles.rightLabel}>{rightLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.rightBtn} />
        )}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '600',
    marginTop: -4,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.title.size - 4, // 24
    fontWeight: typography.title.weight,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.subtitle.size,
    color: colors.textMuted,
    lineHeight: typography.subtitle.size * 1.4,
  },
  rightBtn: {
    minWidth: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  rightLabel: {
    color: colors.primary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  pressed: { opacity: 0.7 },
});