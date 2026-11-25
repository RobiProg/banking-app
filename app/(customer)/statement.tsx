import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { FormSuccessBanner } from '../../components/auth/FormSuccessBanner';
import { DatePickerModal } from '../../components/common/DatePickerModal';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { useAccount } from '../../hooks/useAccount';
import { useProfile } from '../../hooks/useProfile';
import {
  exportStatementPdf,
  fetchStatementSummary,
  printStatementSummary,
  shareExistingStatementPdf,
} from '../../services/statement';
import { formatBDT, formatDateShort, maskAccountNumber } from '../../utils/format';
import {
  STATEMENT_PRESETS,
  formatStatementDate,
  getPresetRange,
  normalizeLocalDate,
  validateDateRange,
  type StatementPresetKey,
  type StatementSummary,
} from '../../utils/statement';

type ActivePicker = 'from' | 'to' | null;

/**
 * Customer Bank Statement Screen.
 * Lets customers choose quick lookback presets (Last 1/2/3/6 Months, Last 1 Year)
 * or custom From/To dates, preview their statement ledger, and export as PDF.
 */
export default function BankStatementScreen() {
  const { account, loading: acctLoading, errorMessage: acctErr, reload: reloadAcct } = useAccount();
  const { profile } = useProfile();

  const initialRange = useMemo(() => getPresetRange(1), []);
  const [preset, setPreset] = useState<StatementPresetKey>('1m');
  const [fromDate, setFromDate] = useState<Date>(initialRange.fromDate);
  const [toDate, setToDate] = useState<Date>(initialRange.toDate);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [lastPdfUri, setLastPdfUri] = useState<string | null>(null);

  const today = useMemo(() => normalizeLocalDate(new Date()), []);
  const rangeValidation = useMemo(
    () => validateDateRange(fromDate, toDate, today),
    [fromDate, toDate, today],
  );

  const loadSummary = useCallback(async () => {
    if (!account || !rangeValidation.ok) {
      setSummary(null);
      return;
    }
    setLoadingSummary(true);
    setSummaryError(null);
    const res = await fetchStatementSummary({
      account,
      profile,
      fromDate,
      toDate,
    });
    setLoadingSummary(false);
    if (res.errorMessage) {
      setSummaryError(res.errorMessage);
      setSummary(null);
      return;
    }
    setSummary(res.summary);
  }, [account, profile, fromDate, toDate, rangeValidation.ok]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!account || !rangeValidation.ok) {
        setSummary(null);
        return;
      }
      setLoadingSummary(true);
      setSummaryError(null);
      const res = await fetchStatementSummary({
        account,
        profile,
        fromDate,
        toDate,
      });
      if (cancelled) return;
      setLoadingSummary(false);
      if (res.errorMessage) {
        setSummaryError(res.errorMessage);
        setSummary(null);
      } else {
        setSummary(res.summary);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [account, profile, fromDate, toDate, rangeValidation.ok]);

  function handleSelectPreset(key: Exclude<StatementPresetKey, 'custom'>, months: number) {
    const range = getPresetRange(months);
    setPreset(key);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setExportError(null);
    setExportSuccessMessage(null);
    setLastPdfUri(null);
  }

  function handlePickedDate(picked: Date) {
    const clean = normalizeLocalDate(picked);
    if (activePicker === 'from') {
      setFromDate(clean);
    } else if (activePicker === 'to') {
      setToDate(clean);
    }
    setPreset('custom');
    setActivePicker(null);
    setExportError(null);
    setExportSuccessMessage(null);
    setLastPdfUri(null);
  }

  async function handleGetStatement() {
    if (!account || !rangeValidation.ok) return;
    setGenerating(true);
    setExportError(null);
    setExportSuccessMessage(null);

    let activeSummary = summary;
    if (!activeSummary) {
      const fresh = await fetchStatementSummary({
        account,
        profile,
        fromDate,
        toDate,
      });
      if (fresh.errorMessage || !fresh.summary) {
        setGenerating(false);
        setExportError(fresh.errorMessage ?? 'Unable to load statement data.');
        return;
      }
      activeSummary = fresh.summary;
      setSummary(fresh.summary);
    }

    const res = await exportStatementPdf(activeSummary);
    setGenerating(false);

    if (res.errorMessage) {
      setExportError(res.errorMessage);
      return;
    }

    setLastPdfUri(res.uri);
    if (res.printedOnWeb) {
      setExportSuccessMessage('Statement print / Save-as-PDF dialog opened.');
    } else {
      setExportSuccessMessage('PDF statement generated and ready to save or share.');
    }
  }

  async function handleReshare() {
    if (!lastPdfUri) return;
    setExportError(null);
    const res = await shareExistingStatementPdf(lastPdfUri, fromDate, toDate);
    if (!res.ok && res.errorMessage) {
      setExportError(res.errorMessage);
    }
  }

  async function handlePrintPreview() {
    if (!summary) return;
    setExportError(null);
    const res = await printStatementSummary(summary);
    if (!res.ok && res.errorMessage) {
      setExportError(res.errorMessage);
    }
  }

  if (acctLoading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading your account…" />
      </ScreenContainer>
    );
  }

  if (acctErr || !account) {
    return (
      <ScreenContainer scrollable={false} centered>
        <ErrorState
          title="Account unavailable"
          message={acctErr ?? 'We could not find your account.'}
          onRetry={reloadAcct}
        />
      </ScreenContainer>
    );
  }

  const previewRows = summary?.rows.slice(-5).reverse() ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Bank Statement"
        subtitle="Select a date range and download your PDF statement"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Strip */}
        <Card variant="surface" style={styles.accountStrip}>
          <View style={styles.accountLeft}>
            <View style={styles.accountIconPlate}>
              <Icon name="document" size={20} color={colors.primary} />
            </View>
            <View style={styles.accountMeta}>
              <Text style={styles.accountHolder} numberOfLines={1}>
                {profile?.full_name ?? 'SmartBank Customer'}
              </Text>
              <Text style={styles.accountSub} numberOfLines={1}>
                Savings • {maskAccountNumber(account.account_number)} • {account.branch?.name ?? 'Main Branch'}
              </Text>
            </View>
          </View>
          <Badge label="PDF" variant="primary" />
        </Card>

        {/* Quick Period Navigation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick period</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRow}
          >
            {STATEMENT_PRESETS.map((p) => {
              const active = preset === p.key;
              return (
                <Pressable
                  key={p.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={p.label}
                  onPress={() => handleSelectPreset(p.key, p.months)}
                  style={({ pressed }) => [
                    styles.presetChip,
                    active && styles.presetChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: preset === 'custom' }}
              accessibilityLabel="Custom date range"
              onPress={() => {
                setPreset('custom');
                setActivePicker('from');
              }}
              style={({ pressed }) => [
                styles.presetChip,
                preset === 'custom' && styles.presetChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.presetLabel, preset === 'custom' && styles.presetLabelActive]}
              >
                Custom
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* From Date & To Date Selectors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statement period</Text>
          <View style={styles.dateRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`From date ${formatStatementDate(fromDate)}`}
              onPress={() => setActivePicker('from')}
              style={({ pressed }) => [
                styles.dateCard,
                !rangeValidation.ok && styles.dateCardError,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.dateHeader}>
                <Text style={styles.dateLabel}>From Date</Text>
                <Icon name="calendar" size={15} color={colors.primary} />
              </View>
              <Text style={styles.dateValue}>{formatStatementDate(fromDate)}</Text>
            </Pressable>

            <View style={styles.dateArrowWrap}>
              <Text style={styles.dateArrow}>→</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`To date ${formatStatementDate(toDate)}`}
              onPress={() => setActivePicker('to')}
              style={({ pressed }) => [
                styles.dateCard,
                !rangeValidation.ok && styles.dateCardError,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.dateHeader}>
                <Text style={styles.dateLabel}>To Date</Text>
                <Icon name="calendar" size={15} color={colors.primary} />
              </View>
              <Text style={styles.dateValue}>{formatStatementDate(toDate)}</Text>
            </Pressable>
          </View>
        </View>

        <FormErrorBanner message={!rangeValidation.ok ? rangeValidation.message : null} />
        <FormErrorBanner message={summaryError} />
        <FormErrorBanner message={exportError} />
        <FormSuccessBanner message={exportSuccessMessage} />

        {/* Statement Summary & Preview */}
        {rangeValidation.ok && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Statement preview</Text>
              {summary ? (
                <Text style={styles.countBadgeText}>
                  {summary.rows.length} {summary.rows.length === 1 ? 'transaction' : 'transactions'}
                </Text>
              ) : null}
            </View>

            {loadingSummary ? (
              <Card style={styles.loadingCard}>
                <LoadingState label="Preparing statement summary…" />
              </Card>
            ) : summaryError ? (
              <Card style={styles.loadingCard}>
                <ErrorState
                  title="Could not load statement"
                  message={summaryError}
                  onRetry={loadSummary}
                />
              </Card>
            ) : summary ? (
              <Card style={styles.summaryCard}>
                <View style={styles.kpiGrid}>
                  <View style={styles.kpiCell}>
                    <Text style={styles.kpiLabel}>Opening Balance</Text>
                    <Text style={styles.kpiValue}>{formatBDT(summary.openingBalance)}</Text>
                  </View>
                  <View style={styles.kpiCell}>
                    <Text style={styles.kpiLabel}>Closing Balance</Text>
                    <Text style={[styles.kpiValue, styles.kpiPrimary]}>
                      {formatBDT(summary.closingBalance)}
                    </Text>
                  </View>
                  <View style={styles.kpiCell}>
                    <Text style={styles.kpiLabel}>Total Credits</Text>
                    <Text style={[styles.kpiValue, styles.kpiCredit]}>
                      +{formatBDT(summary.totalCredits)}
                    </Text>
                  </View>
                  <View style={styles.kpiCell}>
                    <Text style={styles.kpiLabel}>Total Debits</Text>
                    <Text style={[styles.kpiValue, styles.kpiDebit]}>
                      -{formatBDT(summary.totalDebits)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {previewRows.length === 0 ? (
                  <View style={styles.emptyPreview}>
                    <Text style={styles.emptyTitle}>No transactions in this period</Text>
                    <Text style={styles.emptySub}>
                      You can still tap Get Statement to download an official nil-activity PDF statement.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.previewList}>
                    <Text style={styles.previewHeading}>
                      Latest entries in period (full ledger in PDF)
                    </Text>
                    {previewRows.map((row) => (
                      <View key={row.id} style={styles.previewRow}>
                        <View style={styles.previewLeft}>
                          <Text style={styles.previewTitle} numberOfLines={1}>
                            {row.typeLabel}
                          </Text>
                          <Text style={styles.previewMeta} numberOfLines={1}>
                            {formatDateShort(row.createdAt)} • {row.reference}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.previewAmount,
                            row.direction === 'credit'
                              ? styles.kpiCredit
                              : row.direction === 'debit'
                              ? styles.kpiDebit
                              : undefined,
                          ]}
                        >
                          {row.direction === 'credit' ? '+' : row.direction === 'debit' ? '-' : ''}
                          {formatBDT(row.amount)}
                        </Text>
                      </View>
                    ))}
                    {summary.rows.length > 5 && (
                      <Text style={styles.moreHint}>
                        + {summary.rows.length - 5} earlier{' '}
                        {summary.rows.length - 5 === 1 ? 'entry' : 'entries'} included in the PDF
                      </Text>
                    )}
                  </View>
                )}
              </Card>
            ) : null}
          </View>
        )}

        {/* Primary CTA: Get Statement */}
        <View style={styles.ctaWrap}>
          <Button
            title="Get Statement"
            icon="document"
            size="lg"
            variant="primary"
            loading={generating}
            disabled={!rangeValidation.ok || loadingSummary || !!summaryError || generating}
            onPress={handleGetStatement}
          />

          {lastPdfUri ? (
            <View style={styles.secondaryActions}>
              <Button
                title="Share / Save PDF Again"
                variant="secondary"
                size="md"
                onPress={handleReshare}
                style={styles.halfBtn}
              />
              <Button
                title="Print"
                variant="outline"
                size="md"
                onPress={handlePrintPreview}
                style={styles.halfBtn}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <DatePickerModal
        visible={activePicker !== null}
        title={activePicker === 'from' ? 'Select From Date' : 'Select To Date'}
        value={activePicker === 'from' ? fromDate : toDate}
        maxDate={today}
        onSelect={handlePickedDate}
        onCancel={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },
  accountStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  accountIconPlate: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountMeta: {
    flex: 1,
  },
  accountHolder: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  accountSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  presetRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: spacing.base,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetLabelActive: {
    color: colors.textOnPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateCardError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateArrowWrap: {
    paddingHorizontal: 2,
  },
  dateArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  loadingCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  summaryCard: {
    padding: spacing.base,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCell: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  kpiPrimary: {
    color: colors.primary,
  },
  kpiCredit: {
    color: colors.success,
  },
  kpiDebit: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  emptyPreview: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  previewList: {
    gap: spacing.sm,
  },
  previewHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  previewLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  previewAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  moreHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
  ctaWrap: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfBtn: {
    flex: 1,
  },
  pressed: {
    opacity: 0.82,
  },
});
