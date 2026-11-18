import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
};

/**
 * Full-screen error block matching Figma §32.
 * 72×72 circle error-light background with alert icon, 20pt bold title, 14pt secondary message, and styled buttons.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not complete your request. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  onSecondaryAction,
  secondaryLabel = 'Go back',
}: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Icon name="alert" size={36} color={colors.error} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.btnRow}>
        {onSecondaryAction ? (
          <Button
            title={secondaryLabel}
            onPress={onSecondaryAction}
            variant="outline"
            size="md"
            fullWidth={false}
          />
        ) : null}
        {onRetry ? (
          <Button
            title={retryLabel}
            onPress={onRetry}
            variant="primary"
            size="md"
            fullWidth={false}
          />
        ) : null}
      </View>
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
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.15)',
  },
  title: {
    fontSize: 20,
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
    maxWidth: 290,
    marginBottom: spacing.lg,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
