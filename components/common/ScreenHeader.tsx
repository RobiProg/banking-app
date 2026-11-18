import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';

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
 * Mirrors the Figma design system spec (clean back button, 20pt bold title).
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
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Icon name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.backBtnPlaceholder} />
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
          <View style={styles.rightBtnPlaceholder} />
        )}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 36,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rightBtn: {
    minWidth: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightBtnPlaceholder: {
    width: 36,
  },
  rightLabel: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
