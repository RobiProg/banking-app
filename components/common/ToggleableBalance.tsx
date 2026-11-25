import React from 'react';
import {
  ColorValue,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { useBalanceVisibility } from '../../hooks/useBalanceVisibility';
import { Icon } from '../ui/Icon';
import { Money } from './Money';

type ToggleableBalanceProps = {
  value: string | number | null | undefined;
  size?: 'small' | 'medium' | 'large' | 'xl';
  color?: string;
  iconColor?: ColorValue;
  iconSize?: number;
  buttonSize?: number;
  buttonStyle?: StyleProp<ViewStyle>;
  buttonPressedStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Optional controlled override for hidden state. */
  hidden?: boolean;
  /** Optional controlled override for toggle callback. */
  onToggleHide?: () => void;
};

/**
 * Displays a monetary balance masked with asterisks by default alongside an eye
 * toggle button. Tapping the eye icon reveals or re-hides the balance.
 */
export function ToggleableBalance({
  value,
  size = 'medium',
  color,
  iconColor = colors.textSecondary,
  iconSize = 18,
  buttonSize = 30,
  buttonStyle,
  buttonPressedStyle,
  style,
  hidden,
  onToggleHide,
}: ToggleableBalanceProps) {
  const { isBalanceHidden, toggleBalanceVisibility } = useBalanceVisibility();

  const isHidden = hidden ?? isBalanceHidden;
  const handleToggle = onToggleHide ?? toggleBalanceVisibility;

  return (
    <View style={[styles.row, style]}>
      <Money value={value} size={size} color={color} hidden={isHidden} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isHidden ? 'Show balance' : 'Hide balance'}
        accessibilityState={{ expanded: !isHidden }}
        onPress={(e) => {
          e.stopPropagation?.();
          handleToggle();
        }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.eyeBtn,
          { width: buttonSize, height: buttonSize },
          buttonStyle,
          pressed && (buttonPressedStyle ?? styles.eyeBtnPressed),
        ]}
      >
        <Icon
          name={isHidden ? 'eye' : 'eye-off'}
          size={iconSize}
          color={iconColor}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  eyeBtn: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtnPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
});
