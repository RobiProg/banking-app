import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';

type CardProps = {
  children: React.ReactNode;
  /** Surface (gray) vs white card. Default white. */
  variant?: 'surface' | 'outline';
  /** Optional padding override. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Reusable surface card. White variant by default with a thin border;
 * surface variant is the gray `colors.surface` background used for
 * info rows on the dashboard.
 */
export function Card({ children, variant = 'outline', padding, style }: CardProps) {
  const pad = padding ?? spacing.md;
  return (
    <View
      style={[
        styles.base,
        variant === 'outline' ? styles.outline : styles.surface,
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
    borderRadius: 12,
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
});