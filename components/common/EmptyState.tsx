import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Icon, IconName } from '../ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';

type EmptyStateProps = {
  title: string;
  message?: string;
  icon?: IconName;
  ctaLabel?: string;
  onPressCta?: () => void;
};

/**
 * Centered empty state matching Figma §31.
 * 72pt circle with primary tint, 20pt bold H2 title, 14pt secondary text, and primary CTA.
 */
export function EmptyState({
  title,
  message,
  icon = 'wallet',
  ctaLabel,
  onPressCta,
}: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="text">
      <View style={styles.iconCircle}>
        <Icon name={icon} size={36} color={colors.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {ctaLabel && onPressCta ? (
        <View style={styles.ctaWrapper}>
          <Button
            title={ctaLabel}
            onPress={onPressCta}
            variant="primary"
            size="md"
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(10, 107, 211, 0.12)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  ctaWrapper: {
    marginTop: spacing.lg,
  },
});
