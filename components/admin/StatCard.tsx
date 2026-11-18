import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, shadows, spacing, typography } from '../../constants/layout';
import { Icon, IconName } from '../ui/Icon';

type Props = {
  label: string;
  value: string | number;
  /** Optional icon name matching Figma icon tokens. */
  icon?: IconName;
  /** Optional glyph fallback, e.g. '◧' or '◐'. */
  glyph?: string;
};

/**
 * High-fidelity Stat Card for the Admin / Teller dashboard.
 * Styled to match Figma §0 & §5 design tokens.
 */
export function StatCard({ label, value, icon, glyph }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {icon ? (
          <View style={styles.iconPlate}>
            <Icon name={icon} size={16} color={colors.primary} />
          </View>
        ) : glyph ? (
          <Text style={styles.glyph}>{glyph}</Text>
        ) : null}
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.base,
    minHeight: 104,
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: typography.label.size,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  iconPlate: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  glyph: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
});
