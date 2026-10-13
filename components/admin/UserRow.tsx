import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import type { AccountStatus } from '../../types/db';
import { initialsFromName } from '../../utils/format';

type Props = {
  fullName: string;
  email: string | null;
  role: 'customer' | 'admin';
  accountNumber: string | null;
  accountStatus: AccountStatus | null;
  onPress?: () => void;
};

/**
 * Row used in the admin users list.
 */
export function UserRow({
  fullName,
  email,
  role,
  accountNumber,
  accountStatus,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${fullName}, ${role}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarMark}>{initialsFromName(fullName)}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {fullName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {email ?? '—'}
        </Text>
        {accountNumber ? (
          <Text style={styles.accountMeta} numberOfLines={1}>
            {accountNumber}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <View style={[styles.rolePill, role === 'admin' ? styles.roleAdmin : styles.roleCustomer]}>
          <Text style={[styles.rolePillText, role === 'admin' ? styles.roleAdminText : styles.roleCustomerText]}>
            {role === 'admin' ? 'Admin' : 'Customer'}
          </Text>
        </View>
        {accountStatus ? (
          <View
            style={[
              styles.statusPill,
              accountStatus === 'active'
                ? styles.statusActive
                : accountStatus === 'inactive'
                ? styles.statusInactive
                : styles.statusBlocked,
            ]}
          >
            <Text style={styles.statusPillText}>{accountStatus}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarMark: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  middle: { flex: 1, paddingRight: spacing.sm },
  name: { fontSize: typography.body.size, fontWeight: '600', color: colors.text },
  meta: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 2 },
  accountMeta: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  roleCustomer: { backgroundColor: colors.surface },
  roleAdmin: { backgroundColor: colors.primaryLight },
  rolePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  roleCustomerText: { color: colors.text },
  roleAdminText: { color: colors.primaryDark },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusActive: { backgroundColor: colors.successBg },
  statusInactive: { backgroundColor: colors.warning + '22' },
  statusBlocked: { backgroundColor: colors.errorBg },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.text,
  },
});