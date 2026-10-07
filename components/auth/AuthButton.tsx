import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/layout';

type AuthButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
};

/**
 * Primary call-to-action button used on auth screens.
 * Shows a spinner, dims, and locks input while `loading` is true.
 */
export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  accessibilityHint,
}: AuthButtonProps) {
  const isInactive = loading || disabled;
  const isPrimary = variant === 'primary';
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
        isPrimary ? styles.primary : styles.secondary,
        isInactive && styles.disabled,
        loading && styles.loading,
        pressed && !isInactive && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? colors.textOnPrimary : colors.primary}
        />
      ) : (
        <Text
          accessibilityRole="text"
          style={[
            styles.text,
            isPrimary ? styles.textPrimary : styles.textSecondary,
            isInactive && styles.textDisabled,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 48,
  },
  disabled: {
    backgroundColor: colors.primaryDark,
    opacity: 0.6,
  },
  loading: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: typography.body.size + 1, // 16
    fontWeight: '600',
  },
  textPrimary: {
    color: colors.textOnPrimary,
  },
  textSecondary: {
    color: colors.primary,
  },
  textDisabled: {
    color: colors.textOnPrimary,
  },
});