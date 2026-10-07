import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type FormSuccessBannerProps = {
  message?: string | null;
};

/**
 * Green counterpart to `FormErrorBanner`. Used after a successful form
 * submission such as account creation. Announces politely (not assertively)
 * so screen readers don't interrupt the user.
 */
export function FormSuccessBanner({ message }: FormSuccessBannerProps) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      style={styles.container}
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4, // 12
    marginBottom: spacing.md,
  },
  text: {
    color: colors.success,
    fontSize: typography.helper.size,
    fontWeight: '600',
    lineHeight: typography.helper.size + 4,
  },
});