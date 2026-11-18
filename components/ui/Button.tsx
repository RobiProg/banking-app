import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing, typography } from '../../constants/layout';
import { Icon, IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  style,
  accessibilityHint,
}: ButtonProps) {
  const isInactive = loading || disabled;

  // Icon color derived from button variant
  const getIconColor = () => {
    if (disabled) return colors.textTertiary;
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.textOnPrimary;
      case 'secondary':
        return colors.primary;
      case 'outline':
        return colors.text;
      case 'ghost':
        return colors.primary;
    }
  };

  const a11yLabel = loading ? `${title}, loading` : title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      onPress={onPress}
      disabled={isInactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isInactive && styles.disabled,
        loading && styles.loading,
        pressed && !isInactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.textOnPrimary : colors.primary}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={getIconColor()}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`text_size_${size}`],
              isInactive && styles.textDisabled,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={getIconColor()}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md, // 12pt
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  // Sizes
  size_sm: {
    height: 38,
    paddingHorizontal: spacing.md,
  },
  size_md: {
    height: 48,
    paddingHorizontal: spacing.lg,
  },
  size_lg: {
    height: 52,
    paddingHorizontal: spacing.xl,
  },
  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
  },
  // States
  disabled: {
    opacity: 0.5,
  },
  loading: {
    opacity: 0.8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  // Typography
  text: {
    fontWeight: typography.button.weight,
    textAlign: 'center',
  },
  text_size_sm: {
    fontSize: 13,
  },
  text_size_md: {
    fontSize: typography.button.size, // 15pt
  },
  text_size_lg: {
    fontSize: 16,
  },
  text_primary: {
    color: colors.textOnPrimary,
  },
  text_secondary: {
    color: colors.primary,
  },
  text_outline: {
    color: colors.textPrimary,
  },
  text_ghost: {
    color: colors.primary,
  },
  text_danger: {
    color: colors.textOnPrimary,
  },
  textDisabled: {
    color: colors.textTertiary,
  },
});
