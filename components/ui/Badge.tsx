import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { Icon, IconName } from './Icon';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'primary' | 'neutral';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  icon?: IconName;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Badge({
  label,
  variant = 'neutral',
  icon,
  dot = false,
  style,
}: BadgeProps) {
  const getBadgeColor = () => {
    switch (variant) {
      case 'success':
        return { text: colors.success, bg: colors.successBg, border: colors.successBorder };
      case 'warning':
        return { text: colors.warning, bg: colors.warningBg, border: colors.warningBorder };
      case 'error':
        return { text: colors.error, bg: colors.errorBg, border: colors.errorBorder };
      case 'primary':
        return { text: colors.primary, bg: colors.primaryLight, border: colors.primaryMuted };
      default:
        return { text: colors.textSecondary, bg: colors.surface, border: colors.border };
    }
  };

  const scheme = getBadgeColor();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: scheme.bg, borderColor: scheme.border },
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      {dot && <View style={[styles.dot, { backgroundColor: scheme.text }]} />}
      {icon && (
        <Icon
          name={icon}
          size={12}
          color={scheme.text}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, { color: scheme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 24,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
