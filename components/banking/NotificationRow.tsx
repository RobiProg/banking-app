import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import type { Notification } from '../../types/db';
import { formatRelative } from '../../utils/format';

type Props = {
  notification: Notification;
  onPress?: () => void;
};

/**
 * Compact notification row. Used in the customer notifications tab.
 */
export function NotificationRow({ notification, onPress }: Props) {
  const Wrap: React.ElementType = onPress ? Pressable : View;
  const dotColor = notification.is_read ? 'transparent' : colors.primary;
  return (
    <Wrap
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.row,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconPlate}>
        <Text style={styles.iconMark}>!</Text>
      </View>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.time}>{formatRelative(notification.created_at)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>
      <View style={[styles.unreadDot, { backgroundColor: dotColor }]} />
    </Wrap>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 72,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.9 },
  iconPlate: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconMark: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  middle: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.body.size,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    paddingRight: spacing.sm,
  },
  time: {
    fontSize: typography.helper.size,
    color: colors.textMuted,
  },
  message: {
    fontSize: typography.helper.size + 1,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: (typography.helper.size + 1) * 1.4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
});