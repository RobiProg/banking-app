import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type Props = {
  label: string;
  value: string | number;
  /** Optional glyph, e.g. '◧' or '◐'. */
  glyph?: string;
};

/**
 * Big-number stat card for the admin dashboard.
 */
export function StatCard({ label, value, glyph }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {glyph ? <Text style={styles.glyph}>{glyph}</Text> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: typography.label.size,
    color: colors.textMuted,
    fontWeight: '600',
  },
  glyph: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
});