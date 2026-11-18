import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/ui/Icon';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';

/**
 * Admin tabs layout matching SmartBank Figma UI design system.
 * Dashboard · Users · Cash Deposit · Accounts · Branches · Ledger
 */
export default function AdminTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          ...styles.bar,
          height: 52 + bottomInset,
          paddingBottom: bottomInset,
        },
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Icon name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <Icon name="users" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deposit"
        options={{
          title: 'Deposit',
          tabBarIcon: ({ color }) => <Icon name="deposit" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => <Icon name="card" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="branches"
        options={{
          title: 'Branches',
          tabBarIcon: ({ color }) => <Icon name="bank" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color }) => <Icon name="document" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  item: { paddingTop: 4 },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
