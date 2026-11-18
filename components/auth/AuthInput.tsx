import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { TextInputProps } from 'react-native';
import { TextInput } from '../ui/TextInput';

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
} & Omit<TextInputProps, 'style' | 'onChangeText' | 'value' | 'placeholder'>;

/**
 * Backward-compatible wrapper around the new UI TextInput.
 */
export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  containerStyle,
  ...rest
}: AuthInputProps) {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      error={error}
      containerStyle={containerStyle}
      {...rest}
    />
  );
}
