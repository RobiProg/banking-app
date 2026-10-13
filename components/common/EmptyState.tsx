import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type EmptyStateProps = {
  title: string;
  message?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
};

/**
 * Centered empty state used on list screens (transactions,
 * notifications, beneficiaries, etc.). Matches the empty-state recipe
 * in DESIGN_PROMPT §31.
 */
export function EmptyState({ title, message, ctaLabel, onPressCta }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="text">
      <View style={styles.iconPlate}>
        <Text style={styles.iconMark}>—</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {ctaLabel && onPressCta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          onPress={onPressCta}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaLabel}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  iconPlate: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconMark: {
    fontSize: 40,
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs + 2,
  },
  message: {
    fontSize: typography.body.size,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.body.size * 1.4,
    marginBottom: spacing.md,
  },
  cta: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaLabel: {
    color: colors.textOnPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
});