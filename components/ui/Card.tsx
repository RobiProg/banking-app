import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { radius, shadows, spacing } from '../../constants/layout';

export type CardVariant = 'default' | 'surface' | 'elevated' | 'outlined';

export type CardProps = {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Card({
  children,
  variant = 'default',
  style,
  onPress,
  accessibilityLabel,
}: CardProps) {
  const isPressable = typeof onPress === 'function';

  const containerStyle = [
    styles.base,
    styles[variant],
    variant === 'elevated' ? shadows.sm : null,
    style,
  ];

  if (isPressable) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg, // 16pt
    padding: spacing.base, // 16pt
    borderWidth: 1,
    borderColor: colors.border,
  },
  default: {
    backgroundColor: colors.background,
  },
  surface: {
    backgroundColor: colors.surface,
  },
  elevated: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
});
