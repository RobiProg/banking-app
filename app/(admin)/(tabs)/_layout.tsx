import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';

/**
 * Admin tabs:
 *   Dashboard · Users · Accounts · Transactions
 * Matches plan §23 admin navigation.
 */
export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Glyph color={String(color)}>◧</Glyph>,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <Glyph color={String(color)}>◐</Glyph>,
        }}
      />
      <Tabs.Screen
        name="deposit"
        options={{
          title: 'Cash Deposit',
          tabBarIcon: ({ color }) => <Glyph color={String(color)}>💵</Glyph>,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => <Glyph color={String(color)}>▤</Glyph>,
        }}
      />
      <Tabs.Screen
        name="branches"
        options={{
          title: 'Branches',
          tabBarIcon: ({ color }) => <Glyph color={String(color)}>🏛</Glyph>,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => <Glyph color={String(color)}>≡</Glyph>,
        }}
      />
    </Tabs>
  );
}

function Glyph({ color, children }: { color: string; children: React.ReactNode }) {
  return <Text style={[styles.glyph, { color }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  item: { paddingTop: 4 },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  glyph: { fontSize: 22, fontWeight: '700' },
});