import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { radius } from '../../constants/layout';
import { Icon } from './Icon';

export type AvatarProps = {
  name?: string;
  size?: number;
  verified?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({
  name,
  size = 40,
  verified = false,
  style,
}: AvatarProps) {
  const getInitials = (text?: string): string => {
    if (!text || text.trim().length === 0) return 'SB';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.4);

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={name ? `Profile of ${name}` : 'User avatar'}
      >
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      </View>

      {verified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: Math.max(14, Math.round(size * 0.32)),
              height: Math.max(14, Math.round(size * 0.32)),
              borderRadius: radius.pill,
            },
          ]}
        >
          <Icon name="check" size={Math.round(size * 0.2)} color={colors.textOnPrimary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    color: colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
});
