import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
} & Omit<TextInputProps, 'style' | 'onChangeText' | 'value' | 'placeholder'>;

export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  containerStyle,
  accessibilityLabel,
  ...rest
}: AuthInputProps) {
  const a11yDisabled = rest.editable === false;
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null]}
        accessibilityState={{ disabled: a11yDisabled }}
        {...rest}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.errorText}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.label.size,
    fontWeight: typography.label.weight,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md - 2, // 14
    paddingVertical: spacing.sm + 4, // 12
    fontSize: typography.body.size,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 48, // accessibility: >= 44pt hit target
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.helper.size,
    marginTop: spacing.xs + 2, // 6
  },
});