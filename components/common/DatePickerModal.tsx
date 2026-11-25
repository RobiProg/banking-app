import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { radius, shadows, spacing } from '../../constants/layout';
import { Icon } from '../ui/Icon';
import { normalizeLocalDate } from '../../utils/statement';

type DatePickerModalProps = {
  visible: boolean;
  title: string;
  value: Date;
  minDate?: Date;
  maxDate?: Date;
  onSelect: (date: Date) => void;
  onCancel: () => void;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Cross-platform calendar date picker modal matching SmartBank's design tokens.
 * Avoids native DateTimePicker discrepancies across iOS, Android, and Web.
 */
export function DatePickerModal({
  visible,
  title,
  value,
  minDate,
  maxDate,
  onSelect,
  onCancel,
}: DatePickerModalProps) {
  const [cursorMonth, setCursorMonth] = useState<Date>(() =>
    new Date(value.getFullYear(), value.getMonth(), 1),
  );

  useEffect(() => {
    if (visible) {
      setCursorMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    }
  }, [visible, value]);

  const today = useMemo(() => normalizeLocalDate(new Date()), []);
  const selectedDay = useMemo(() => normalizeLocalDate(value), [value]);
  const minBound = useMemo(() => (minDate ? normalizeLocalDate(minDate) : null), [minDate]);
  const maxBound = useMemo(() => (maxDate ? normalizeLocalDate(maxDate) : null), [maxDate]);

  const year = cursorMonth.getFullYear();
  const month = cursorMonth.getMonth();

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i += 1) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(new Date(year, month, d));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [year, month]);

  function isDisabledDay(d: Date): boolean {
    const t = d.getTime();
    if (minBound && t < minBound.getTime()) return true;
    if (maxBound && t > maxBound.getTime()) return true;
    return false;
  }

  function shiftMonth(delta: number) {
    setCursorMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  const todayDisabled = isDisabledDay(today);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close calendar"
              onPress={onCancel}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Year & Month Navigation */}
          <View style={styles.navBar}>
            <View style={styles.navGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous year"
                onPress={() => shiftMonth(-12)}
                hitSlop={6}
                style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
              >
                <Text style={styles.doubleArrow}>«</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => shiftMonth(-1)}
                hitSlop={6}
                style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
              >
                <Icon name="chevron-left" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.monthLabel}>
              {MONTH_NAMES[month]} {year}
            </Text>

            <View style={styles.navGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => shiftMonth(1)}
                hitSlop={6}
                style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
              >
                <Icon name="chevron-right" size={18} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next year"
                onPress={() => shiftMonth(12)}
                hitSlop={6}
                style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
              >
                <Text style={styles.doubleArrow}>»</Text>
              </Pressable>
            </View>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={styles.weekCell}>
                <Text style={styles.weekText}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Day Grid */}
          <View style={styles.grid}>
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }
              const disabled = isDisabledDay(cell);
              const selected = isSameDay(cell, selectedDay);
              const isToday = isSameDay(cell, today);

              return (
                <Pressable
                  key={cell.toISOString()}
                  accessibilityRole="button"
                  accessibilityLabel={cell.toDateString()}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelect(cell)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    isToday && !selected && styles.dayToday,
                    selected && styles.daySelected,
                    disabled && styles.dayDisabled,
                    pressed && !disabled && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && !selected && styles.dayTodayText,
                      selected && styles.daySelectedText,
                      disabled && styles.dayDisabledText,
                    ]}
                  >
                    {cell.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Footer Shortcuts */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select today"
              disabled={todayDisabled}
              onPress={() => onSelect(today)}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.todayBtn,
                todayDisabled && styles.dayDisabled,
                pressed && !todayDisabled && styles.pressed,
              ]}
            >
              <Text style={[styles.todayBtnText, todayDisabled && styles.dayDisabledText]}>
                Today
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onCancel}
              style={({ pressed }) => [styles.footerBtn, styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 43, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekCell: {
    width: '14.285%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  dayDisabled: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dayTodayText: {
    color: colors.primary,
    fontWeight: '700',
  },
  daySelectedText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  dayDisabledText: {
    color: colors.textTertiary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    paddingHorizontal: spacing.base,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    backgroundColor: colors.primaryLight,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  cancelBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.78,
  },
});
