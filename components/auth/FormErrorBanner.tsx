import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type FormErrorBannerProps = {
  message?: string | null;
};

/**
 * Single source of truth for the red error strip shown above form submit
 * buttons. Returns nothing when `message` is empty so screens don't need to
 * branch on whether an error is present.
 *
 * Announces via VoiceOver / TalkBack immediately (assertive live region).
 */
export function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={message}
      style={styles.container}
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4, // 12
    marginBottom: spacing.md,
  },
  text: {
    color: colors.error,
    fontSize: typography.helper.size,
    fontWeight: '600',
    lineHeight: typography.helper.size + 4,
  },
});