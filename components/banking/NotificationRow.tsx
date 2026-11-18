import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '../ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import type { Notification } from '../../types/db';
import { formatRelative } from '../../utils/format';

type Props = {
  notification: Notification;
  onPress?: () => void;
};

/**
 * Compact notification row. Matches Figma §15.
 * 72 pt tall, category-tinted icon plate, unread accent dot.
 */
export function NotificationRow({ notification, onPress }: Props) {
  const Wrap: React.ElementType = onPress ? Pressable : View;

  // Derive icon & color from notification title/content
  const getIconConfig = (): { name: IconName; bg: string; fg: string } => {
    const text = (notification.title + ' ' + notification.message).toLowerCase();
    if (text.includes('transfer') || text.includes('sent') || text.includes('received')) {
      return { name: 'send', bg: colors.primaryLight, fg: colors.primary };
    }
    if (text.includes('deposit') || text.includes('credited')) {
      return { name: 'arrow-down', bg: colors.successBg, fg: colors.success };
    }
    if (text.includes('withdraw') || text.includes('debited')) {
      return { name: 'arrow-up', bg: colors.warningBg, fg: colors.warning };
    }
    return { name: 'bell', bg: colors.surface, fg: colors.textSecondary };
  };

  const iconCfg = getIconConfig();

  return (
    <Wrap
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.row,
        !notification.is_read && styles.rowUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconPlate, { backgroundColor: iconCfg.bg }]}>
        <Icon name={iconCfg.name} size={18} color={iconCfg.fg} />
      </View>

      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              !notification.is_read && styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={styles.time}>{formatRelative(notification.created_at)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      {!notification.is_read && <View style={styles.unreadDot} />}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    height: 72, // Figma specification: 72 pt tall
    marginBottom: spacing.sm,
  },
  rowUnread: {
    backgroundColor: '#F9FBFF',
    borderColor: colors.primaryMuted,
  },
  pressed: {
    opacity: 0.9,
    backgroundColor: colors.surfaceSubtle,
  },
  iconPlate: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  middle: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  titleUnread: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 11,
    color: colors.textTertiary,
    flexShrink: 0,
  },
  message: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
});
