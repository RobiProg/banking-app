import React from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { formatBDT } from '../../utils/format';

type MoneyProps = {
  /** Numeric value or numeric-string from Supabase NUMERIC column. */
  value: string | number | null | undefined;
  /** Large (32pt) for hero balance, medium (18pt) for rows, small (14pt) for meta. */
  size?: 'small' | 'medium' | 'large' | 'xl';
  /** Color override. Default text primary. */
  color?: string;
  weight?: TextStyle['fontWeight'];
  style?: ViewStyle;
};

/**
 * Formats a numeric string from Supabase NUMERIC column or a JS number
 * as ৳X,XXX.XX using tabular-nums-friendly Inter fallback.
 *
 * Always use this for monetary values to avoid stringly-typed
 * numbers or `parseFloat` round-trips.
 */
export function Money({
  value,
  size = 'medium',
  color,
  weight,
  style,
}: MoneyProps) {
  const fontSize = SIZE[size].fontSize;
  return (
    <Text
      style={[
        styles.base,
        { fontSize, color: color ?? colors.text, fontWeight: weight ?? SIZE[size].weight },
        style as TextStyle,
      ]}
    >
      {formatBDT(value)}
    </Text>
  );
}

const SIZE: Record<NonNullable<MoneyProps['size']>, { fontSize: number; weight: TextStyle['fontWeight'] }> = {
  small: { fontSize: 13, weight: '500' },
  medium: { fontSize: 16, weight: '600' },
  large: { fontSize: 22, weight: '700' },
  xl: { fontSize: 32, weight: '700' },
};

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
  },
});