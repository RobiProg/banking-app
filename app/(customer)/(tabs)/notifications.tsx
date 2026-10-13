import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { NotificationRow } from '../../../components/banking/NotificationRow';
import { useNotifications } from '../../../hooks/useNotifications';
import { dateGroupLabel } from '../../../utils/format';

/**
 * Customer notifications tab (Phase 12).
 * Live-updated via Realtime; tap-to-mark-read; mark-all-read.
 */
export default function CustomerNotificationsTab() {
  const { notifications, loading, errorMessage, reload, setRead, markAllRead, unreadCount } =
    useNotifications();

  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Alerts</Text>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            onPress={markAllRead}
            hitSlop={8}
            style={({ pressed }) => [styles.markAllBtn, pressed && styles.pressed]}
          >
            <Text style={styles.markAllLabel}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.body}>
          <LoadingState label="Loading notifications…" />
        </View>
      ) : errorMessage ? (
        <View style={styles.body}>
          <ErrorState
            title="Could not load notifications"
            message={errorMessage}
            onRetry={reload}
          />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No notifications yet"
            message="We'll let you know when money moves in or out of your account."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onPress={() => {
                    if (!n.is_read) setRead(n.id, true);
                  }}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function groupByDate<T extends { id: string; created_at: string }>(
  items: T[],
): { label: string; items: T[] }[] {
  const groups = new Map<string, { label: string; items: T[] }>();
  for (const it of items) {
    const label = dateGroupLabel(it.created_at);
    if (!groups.has(label)) groups.set(label, { label, items: [] });
    groups.get(label)!.items.push(it);
  }
  return Array.from(groups.values());
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  markAllBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2 },
  markAllLabel: {
    color: colors.primary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  pressed: { opacity: 0.7 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  group: { marginTop: spacing.md },
  groupLabel: {
    fontSize: typography.label.size,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
});