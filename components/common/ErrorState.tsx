import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
};

/**
 * Full-screen error block. Used when a fetch fails or an RPC throws.
 * Matches the error recipe in DESIGN_PROMPT §32.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not complete your request. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  onSecondaryAction,
  secondaryLabel = 'Sign out',
}: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconPlate}>
        <Text style={styles.iconMark}>!</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.btnRow}>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={retryLabel}
            onPress={onRetry}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaLabel}>{retryLabel}</Text>
          </Pressable>
        ) : null}
        {onSecondaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            onPress={onSecondaryAction}
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.secondaryCtaLabel}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  iconPlate: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconMark: {
    fontSize: 36,
    color: colors.error,
    fontWeight: '800',
  },
  title: {
    fontSize: 20,
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
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaLabel: {
    color: colors.textOnPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  secondaryCta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryCtaLabel: {
    color: colors.text,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
});