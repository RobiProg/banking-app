import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/ui/Icon';
import { colors } from '../../../constants/colors';
import { radius, spacing } from '../../../constants/layout';
import { useNotifications } from '../../../hooks/useNotifications';

/**
 * Bottom tab bar for the customer application. Matches Figma §34.
 * Home · Transactions · Notifications · Profile
 * Notifications tab displays unread alert badge.
 */
export default function CustomerTabsLayout() {
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          ...styles.bar,
          height: 58 + bottomInset,
          paddingBottom: Math.max(bottomInset, 8),
        },
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="bank" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => <Icon name="history" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconWrap}>
              <Icon name="bell" size={20} color={color} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingTop: 6,
  },
  item: {
    paddingTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.textOnPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
});
