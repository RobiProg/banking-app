import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { TextInput } from '../../components/ui/TextInput';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Money } from '../../components/common/Money';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../hooks/useAccount';
import { appWithdraw, generateIdempotencyKey } from '../../services/transactions';
import { isValidBankingAmount, formatBDT } from '../../utils/format';
import { parseAmount, type Transaction } from '../../types/db';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

/**
 * Simulated Customer Withdrawal Screen (SRS v2.2 FR-WD-01..06, TC-16, TC-17).
 * Aligned with Figma Design System (cards, buttons, inputs, quick amount chips).
 */
export default function WithdrawScreen() {
  const router = useRouter();
  const { account, loading, errorMessage, reload } = useAccount();

  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);

  if (loading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading your account…" />
      </ScreenContainer>
    );
  }

  if (errorMessage || !account) {
    return (
      <ScreenContainer scrollable={false} centered>
        <ErrorState
          title="Account unavailable"
          message={errorMessage ?? 'Account not found.'}
          onRetry={reload}
        />
      </ScreenContainer>
    );
  }

  if (account.status !== 'active') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Withdraw" subtitle="Simulated Cash Withdrawal" />
        <View style={styles.body}>
          <ErrorState
            title="Account inactive"
            message="Your account is not active, so you cannot withdraw funds right now."
          />
        </View>
      </SafeAreaView>
    );
  }

  const balanceNum = parseAmount(account.balance);
  const validation = isValidBankingAmount(amount);
  const amountNum = validation.value ?? 0;
  const overBalance = validation.ok && amountNum > balanceNum;
  const resultingBalance = balanceNum - amountNum;

  function handleOpenConfirm() {
    if (!validation.ok || overBalance) return;
    setIdempotencyKey(generateIdempotencyKey());
    setShowConfirm(true);
  }

  async function handleConfirmWithdrawal() {
    if (!validation.ok || overBalance) return;
    setError(null);
    setSubmitting(true);

    const res = await appWithdraw({
      amount: amountNum,
      idempotencyKey: idempotencyKey,
    });

    setSubmitting(false);

    if (res.errorMessage) {
      setError(res.errorMessage);
      setShowConfirm(false);
      return;
    }

    setShowConfirm(false);
    setCompletedTxn(res.transaction);
  }

  // --- Success Modal / Screen ---
  if (completedTxn) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Withdrawal Receipt" />
        <ScrollView contentContainerStyle={styles.receiptScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.receiptCard}>
            <View style={styles.successIconCircle}>
              <Icon name="check" size={32} color={colors.primary} />
            </View>
            <Text style={styles.receiptTitle}>Withdrawal Recorded</Text>
            <Money value={completedTxn.amount} size="xl" color={colors.textPrimary} />

            <View style={styles.receiptDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Reference</Text>
                <Text style={styles.receiptValue}>{completedTxn.reference}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Account</Text>
                <Text style={styles.receiptValue}>{account.account_number}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Remaining Balance</Text>
                <Text style={styles.receiptValue}>{formatBDT(resultingBalance)}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>Completed</Text>
                </View>
              </View>
            </View>

            <View style={styles.noCashNotice}>
              <Icon name="info" size={16} color={colors.primary} />
              <Text style={styles.noCashText}>
                Educational demo only. No physical cash is dispensed (FR-WD-05).
              </Text>
            </View>
          </View>

          <Button
            title="Done"
            onPress={() => router.replace(ROUTES.customer)}
            size="lg"
            variant="primary"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Withdraw"
        subtitle="Simulated Cash Withdrawal"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Physical Cash Disclaimer (FR-WD-05) */}
        <View style={styles.banner}>
          <Icon name="alert" size={18} color={colors.warning} />
          <Text style={styles.bannerText}>
            Simulated demonstration only: SmartBank does not dispense physical currency or connect to physical ATMs.
          </Text>
        </View>

        {/* Source Account Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceCardHeader}>
            <View>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Money value={account.balance} size="large" />
            </View>
            <View style={styles.accountNumberBadge}>
              <Text style={styles.accountNumberText}>{account.account_number}</Text>
            </View>
          </View>
        </Card>

        {error && <FormErrorBanner message={error} />}

        <Card style={styles.formCard}>
          <TextInput
            label="Amount to withdraw (৳)"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              setError(null);
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            leftIcon="dollar"
            error={
              !validation.ok && amount.length > 0
                ? validation.message
                : overBalance
                ? 'Amount exceeds your available balance'
                : null
            }
          />

          {/* Preset quick buttons */}
          <Text style={styles.presetLabel}>Quick Select Amount</Text>
          <View style={styles.presetsRow}>
            {PRESET_AMOUNTS.map((p) => {
              const active = amount === p.toString();
              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    setAmount(p.toString());
                    setError(null);
                  }}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>
                    ৳{p.toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {validation.ok && !overBalance && (
            <View style={styles.resultingBox}>
              <View style={styles.resultingRow}>
                <Text style={styles.resultingLabel}>Remaining Balance</Text>
                <Text style={styles.resultingValue}>{formatBDT(resultingBalance)}</Text>
              </View>
            </View>
          )}

          <Button
            title="Withdraw"
            onPress={handleOpenConfirm}
            disabled={!validation.ok || overBalance}
            size="lg"
            variant="primary"
          />
        </Card>
      </ScrollView>

      {/* Confirmation Dialog (FR-WD-02) */}
      <ConfirmDialog
        visible={showConfirm}
        title="Confirm Simulated Withdrawal"
        message={`Debit ${formatBDT(amountNum)} from account ${account.account_number}? Resulting balance will be ${formatBDT(resultingBalance)}.`}
        confirmLabel="Confirm Withdrawal"
        loading={submitting}
        onConfirm={handleConfirmWithdrawal}
        onCancel={() => setShowConfirm(false)}
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
    gap: spacing.base,
  },
  body: {
    flex: 1,
    padding: spacing.base,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  balanceCard: {
    backgroundColor: colors.surface,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  accountNumberBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  accountNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  formCard: {
    gap: spacing.base,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  presetTextActive: {
    color: colors.primary,
  },
  resultingBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultingLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  resultingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  receiptScroll: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  receiptCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  receiptDetails: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  receiptLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusPill: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  noCashNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
    width: '100%',
  },
  noCashText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryDark,
    lineHeight: 16,
  },
});
