import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, shadows, spacing } from '../../constants/layout';

type CardProps = {
  children: React.ReactNode;
  /** Surface (gray) vs white card. Default white. */
  variant?: 'surface' | 'outline' | 'elevated';
  /** Optional padding override. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Reusable surface card matching Figma §0 (16pt radius, 1pt border #E2E6EB, subtle shadow).
 */
export function Card({ children, variant = 'outline', padding, style }: CardProps) {
  const pad = padding ?? spacing.base;
  return (
    <View
      style={[
        styles.base,
        variant === 'outline' ? styles.outline : variant === 'surface' ? styles.surface : styles.elevated,
        { padding: pad },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg, // 16pt radius
  },
  outline: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
});
