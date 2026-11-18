import React from 'react';
import { ColorValue, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../constants/colors';

export type IconName =
  | 'home'
  | 'shield'
  | 'mail'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'send'
  | 'receive'
  | 'arrow-up'
  | 'arrow-down'
  | 'card'
  | 'qr'
  | 'bell'
  | 'search'
  | 'filter'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'user'
  | 'users'
  | 'logout'
  | 'biometrics'
  | 'alert'
  | 'info'
  | 'bank'
  | 'building'
  | 'copy'
  | 'wallet'
  | 'refresh'
  | 'history'
  | 'close'
  | 'phone'
  | 'id-card'
  | 'plus'
  | 'deposit'
  | 'dollar'
  | 'calendar'
  | 'document'
  | 'trending-up'
  | 'trending-down'
  | 'check-circle'
  | 'settings';

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

// High-fidelity Unicode glyphs chosen for pixel-perfect cross-platform rendering
const GLYPH_MAP: Record<IconName, string> = {
  home: '⌂',
  shield: '🛡',
  mail: '✉',
  lock: '🔒',
  eye: '👁',
  'eye-off': '⊘',
  send: '↗',
  receive: '↙',
  'arrow-up': '↑',
  'arrow-down': '↓',
  card: '💳',
  qr: '⚏',
  bell: '🔔',
  search: '🔍',
  filter: '☰',
  check: '✓',
  'check-circle': '✓',
  'chevron-left': '‹',
  'chevron-right': '›',
  'chevron-down': '⌄',
  'chevron-up': '⌃',
  user: '👤',
  users: '👥',
  logout: '⇥',
  biometrics: '◎',
  alert: '⚠',
  info: 'ℹ',
  bank: '🏛',
  building: '🏢',
  copy: '📋',
  wallet: '👛',
  refresh: '↻',
  history: '⏱',
  close: '✕',
  phone: '📞',
  'id-card': '🪪',
  plus: '+',
  deposit: '⤓',
  dollar: '৳',
  calendar: '📅',
  document: '📄',
  'trending-up': '↗',
  'trending-down': '↘',
  settings: '⚙',
};

// Clean geometric styling for crisp line appearance
const GEOMETRIC_GLYPHS: Partial<Record<IconName, string>> = {
  home: '⌂',
  send: '↗',
  receive: '↙',
  'arrow-up': '↑',
  'arrow-down': '↓',
  'chevron-left': '‹',
  'chevron-right': '›',
  'chevron-down': '⌄',
  'chevron-up': '⌃',
  check: '✓',
  'check-circle': '✓',
  close: '✕',
  refresh: '↻',
  filter: '☰',
  biometrics: '◎',
  plus: '+',
  deposit: '⤓',
  history: '⏱',
  'eye-off': '⊘',
};

/**
 * Universal Icon component for SmartBank.
 * Renders consistent, responsive glyphs across iOS, Android and Web without external native font dependencies.
 */
export function Icon({
  name,
  size = 20,
  color = colors.text,
  style,
}: IconProps) {
  const glyph = GEOMETRIC_GLYPHS[name] || GLYPH_MAP[name] || '•';

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        style,
      ]}
      accessible={false}
    >
      <Text
        style={[
          styles.glyph,
          {
            fontSize: size * 0.78,
            lineHeight: size,
            color,
          },
        ]}
      >
        {glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
