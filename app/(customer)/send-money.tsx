import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Card } from '../../components/common/Card';
import { Money } from '../../components/common/Money';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { useAccount } from '../../hooks/useAccount';
import { lookupAccount } from '../../services/accounts';
import { transferMoney } from '../../services/transactions';
import { formatBDT, isValidAmountInput } from '../../utils/format';
import { parseAmount } from '../../types/db';

type Step = 1 | 2 | 3;

/**
 * Send money (Phase 10) — 3-step flow:
 *   1. Recipient account number (with lookup validation)
 *   2. Amount + optional note
 *   3. Confirmation sheet
 *
 * The actual transfer runs through the atomic `transfer_money` RPC.
 */
export default function SendMoneyScreen() {
  const router = useRouter();
  const { account, loading, errorMessage, reload } = useAccount();

  const [step, setStep] = useState<Step>(1);
  const [recipient, setRecipient] = useState('');
  const [recipientStatus, setRecipientStatus] = useState<{
    checking: boolean;
    exists: boolean | null;
    statusMsg: string | null;
  }>({ checking: false, exists: null, statusMsg: null });
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (loading) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading…" />
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
        <ScreenHeader title="Send money" subtitle="Transfer to another account" />
        <View style={styles.body}>
          <ErrorState
            title="Account inactive"
            message="Your account is not active, so you cannot send money right now."
          />
        </View>
      </SafeAreaView>
    );
  }

  async function validateRecipient(): Promise<boolean> {
    const trimmed = recipient.trim();
    if (!trimmed) {
      setRecipientStatus({ checking: false, exists: null, statusMsg: 'Please enter an account number.' });
      return false;
    }
    if (trimmed === account!.account_number) {
      setRecipientStatus({
        checking: false,
        exists: null,
        statusMsg: 'You cannot transfer to your own account.',
      });
      return false;
    }
    setRecipientStatus({ checking: true, exists: null, statusMsg: null });
    const res = await lookupAccount(trimmed);
    if (res.errorMessage) {
      setRecipientStatus({ checking: false, exists: false, statusMsg: res.errorMessage });
      return false;
    }
    if (!res.info) {
      setRecipientStatus({ checking: false, exists: false, statusMsg: 'No account found.' });
      return false;
    }
    if (res.info.status !== 'active') {
      setRecipientStatus({
        checking: false,
        exists: false,
        statusMsg: 'Recipient account is inactive.',
      });
      return false;
    }
    setRecipientStatus({ checking: false, exists: true, statusMsg: null });
    return true;
  }

  async function handleContinueFromRecipient() {
    const ok = await validateRecipient();
    if (ok) setStep(2);
  }

  const balanceNum = parseAmount(account.balance);
  const validation = isValidAmountInput(amount);
  const overBalance = validation.ok && (validation.value ?? 0) > balanceNum;
  const showAmountError =
    !validation.ok
      ? validation.message ?? null
      : overBalance
      ? 'Amount exceeds your available balance.'
      : null;
  const canContinueFromAmount = validation.ok && !overBalance;

  async function handleConfirmTransfer() {
    if (!validation.ok || overBalance) return;
    setSubmitting(true);
    setError(null);
    const res = await transferMoney(
      recipient.trim(),
      validation.value!,
      note.trim() || null,
    );
    setSubmitting(false);
    if (res.errorMessage) {
      setError(res.errorMessage);
      return;
    }
    router.replace({
      pathname: '/(customer)/transaction-details',
      params: { id: res.transaction!.id, just: '1' },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Send money"
        subtitle={step === 1 ? 'Step 1 of 3 — Recipient' : step === 2 ? 'Step 2 of 3 — Amount' : 'Step 3 of 3 — Confirm'}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={styles.stepBody}>
            <Card variant="surface">
              <Text style={styles.label}>Your account</Text>
              <Text style={styles.meta}>{account.account_number}</Text>
              <Money value={account.balance} size="medium" />
            </Card>

            <AuthInput
              label="Recipient account number"
              value={recipient}
              onChangeText={(t) => {
                setRecipient(t);
                setRecipientStatus({ checking: false, exists: null, statusMsg: null });
                setError(null);
              }}
              placeholder="e.g. AC1000000002"
              autoCapitalize="characters"
              autoCorrect={false}
              error={recipientStatus.statusMsg}
              accessibilityHint="Account number of the person you want to send money to"
            />

            {recipientStatus.checking ? (
              <Text style={styles.helper}>Checking account…</Text>
            ) : null}

            <AuthButton
              title="Continue"
              onPress={handleContinueFromRecipient}
              disabled={recipientStatus.checking}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBody}>
            <Card variant="surface">
              <Text style={styles.label}>To</Text>
              <Text style={styles.meta}>{recipient}</Text>
            </Card>

            <AuthInput
              label="Amount"
              value={amount}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                setAmount(cleaned);
                setError(null);
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              error={amount.length > 0 ? showAmountError : null}
              accessibilityHint="Amount in taka to send"
            />
            <Text style={styles.helper}>Available: {formatBDT(account.balance)}</Text>

            <AuthInput
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              placeholder="What's this for?"
              autoCapitalize="sentences"
            />

            <FormErrorBanner message={error} />

            <View style={styles.btnRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => setStep(1)}
                style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
              >
                <Text style={styles.btnGhostLabel}>Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <AuthButton
                  title="Continue"
                  onPress={() => setStep(3)}
                  disabled={!canContinueFromAmount}
                />
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBody}>
            <Card variant="surface">
              <Text style={styles.label}>Recipient</Text>
              <Text style={styles.meta}>{recipient}</Text>
            </Card>
            <Card variant="surface">
              <Text style={styles.label}>Amount</Text>
              <Money value={Number(amount)} size="large" />
              {note.trim() ? (
                <>
                  <Text style={[styles.label, { marginTop: spacing.sm }]}>Note</Text>
                  <Text style={styles.meta}>{note.trim()}</Text>
                </>
              ) : null}
            </Card>
            <FormErrorBanner message={error} />
            <View style={styles.btnRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => setStep(2)}
                style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
              >
                <Text style={styles.btnGhostLabel}>Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <AuthButton title="Send money" onPress={() => setShowConfirm(true)} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={showConfirm}
        title="Confirm transfer"
        message={`You are about to send ${formatAmount(amount)} to account ${recipient.trim()}.`}
        confirmLabel="Confirm transfer"
        loading={submitting}
        onConfirm={handleConfirmTransfer}
        onCancel={() => (submitting ? null : setShowConfirm(false))}
      />
    </SafeAreaView>
  );
}

function formatAmount(raw: string): string {
  const v = isValidAmountInput(raw);
  return v.ok ? `৳${Number(raw).toFixed(2)}` : '৳0.00';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: spacing.lg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  stepBody: {
    gap: spacing.md,
  },
  label: {
    fontSize: typography.label.size,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: typography.body.size,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  helper: {
    fontSize: typography.helper.size,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btnGhost: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostLabel: {
    color: colors.text,
    fontSize: typography.body.size + 1,
    fontWeight: '600',
  },
  pressed: { opacity: 0.85 },
});