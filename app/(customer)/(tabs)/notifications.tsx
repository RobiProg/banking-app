import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../../components/ui/Icon';
import { colors } from '../../../constants/colors';
import { radius, spacing } from '../../../constants/layout';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { NotificationRow } from '../../../components/banking/NotificationRow';
import { useNotifications } from '../../../hooks/useNotifications';
import { dateGroupLabel } from '../../../utils/format';

type TabKey = 'all' | 'transactions' | 'alerts';

/**
 * Notifications Feed Screen. Matches Figma §15.
 * Live-updated via Realtime; filter tabs; mark-read actions.
 */
export default function CustomerNotificationsTab() {
  const { notifications, loading, errorMessage, reload, setRead, markAllRead, unreadCount } =
    useNotifications();

  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // Filter notifications by category tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'transactions') {
      return notifications.filter((n) => {
        const text = (n.title + ' ' + n.message).toLowerCase();
        return text.includes('transfer') || text.includes('deposit') || text.includes('withdraw');
      });
    }
    return notifications.filter((n) => {
      const text = (n.title + ' ' + n.message).toLowerCase();
      return !text.includes('transfer') && !text.includes('deposit') && !text.includes('withdraw');
    });
  }, [notifications, activeTab]);

  const grouped = useMemo(() => groupByDate(filteredNotifications), [filteredNotifications]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Bar (§15) */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            onPress={markAllRead}
            hitSlop={8}
            style={({ pressed }) => [styles.markAllBtn, pressed && styles.pressed]}
          >
            <Icon name="check" size={14} color={colors.primary} />
            <Text style={styles.markAllLabel}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Tabs Row */}
      <View style={styles.tabBar}>
        {(['all', 'transactions', 'alerts'] as TabKey[]).map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, isSelected && styles.tabItemActive]}
            >
              <Text style={[styles.tabLabel, isSelected && styles.tabLabelActive]}>
                {tab === 'all' ? 'All' : tab === 'transactions' ? 'Transactions' : 'Alerts'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.body}>
          <LoadingState label="Loading alerts…" />
        </View>
      ) : errorMessage ? (
        <View style={styles.body}>
          <ErrorState
            title="Could not load notifications"
            message={errorMessage}
            onRetry={reload}
          />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No notifications yet"
            message="We will notify you here when transactions, deposits, or account notices occur."
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 24, // Figma specification: 24 pt bold
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
  },
  markAllLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textOnPrimary,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxl,
  },
  group: {
    marginBottom: spacing.base,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
});
