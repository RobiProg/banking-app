import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing, typography } from '../../constants/layout';
import { Icon, IconName } from './Icon';

export type InputProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
} & Omit<RNTextInputProps, 'style' | 'onChangeText' | 'value' | 'placeholder'>;

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  isPassword = false,
  accessibilityLabel,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const isSecure = isPassword && !showPassword;
  const effectiveRightIcon = isPassword
    ? showPassword
      ? 'eye-off'
      : 'eye'
    : rightIcon;

  const handleRightPress = isPassword
    ? () => setShowPassword((prev) => !prev)
    : onRightIconPress;

  const a11yDisabled = rest.editable === false;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
          a11yDisabled && styles.inputWrapperDisabled,
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Icon
              name={leftIcon}
              size={18}
              color={error ? colors.error : isFocused ? colors.primary : colors.textSecondary}
            />
          </View>
        )}

        <RNTextInput
          accessibilityLabel={accessibilityLabel ?? label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            effectiveRightIcon ? styles.inputWithRightIcon : null,
          ]}
          accessibilityState={{ disabled: a11yDisabled }}
          {...rest}
        />

        {effectiveRightIcon && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPassword ? (showPassword ? 'Hide password' : 'Show password') : 'Action'}
            onPress={handleRightPress}
            hitSlop={8}
            style={styles.rightIconContainer}
          >
            <Icon
              name={effectiveRightIcon}
              size={18}
              color={isFocused ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.label.size,
    fontWeight: typography.label.weight,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md, // 12pt
    height: 52, // Figma specification
    paddingHorizontal: spacing.base,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceRaised,
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: typography.body.size,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
  leftIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  rightIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.helper.size,
    marginTop: spacing.xs,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.helper.size,
    marginTop: spacing.xs,
  },
});
