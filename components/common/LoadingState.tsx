import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type LoadingStateProps = {
  label?: string;
  /** Inline (no flex) or full-screen (flex 1). Default inline. */
  fullscreen?: boolean;
};

/**
 * Lightweight loading indicator. For lists we just show a centered
 * spinner; full-screen variant centres vertically.
 */
export function LoadingState({ label, fullscreen }: LoadingStateProps) {
  const Wrap = fullscreen ? View : View;
  return (
    <View
      style={[
        styles.container,
        fullscreen ? styles.fullscreen : styles.inline,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      <ActivityIndicator color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    paddingVertical: spacing.lg,
  },
  fullscreen: {
    flex: 1,
  },
  label: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: typography.helper.size,
  },
});