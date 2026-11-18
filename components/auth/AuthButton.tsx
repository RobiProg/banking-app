import React from 'react';
import { Button, ButtonVariant } from '../ui/Button';

type AuthButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
};

/**
 * Backward-compatible wrapper around the new UI Button.
 */
export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  accessibilityHint,
}: AuthButtonProps) {
  const uiVariant: ButtonVariant = variant === 'secondary' ? 'outline' : 'primary';
  return (
    <Button
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      variant={uiVariant}
      size="lg"
      accessibilityHint={accessibilityHint}
    />
  );
}
