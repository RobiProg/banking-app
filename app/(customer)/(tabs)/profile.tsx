import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { ROUTES } from '../../../constants/routes';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { AuthInput } from '../../../components/auth/AuthInput';
import { AuthButton } from '../../../components/auth/AuthButton';
import { FormErrorBanner } from '../../../components/auth/FormErrorBanner';
import { FormSuccessBanner } from '../../../components/auth/FormSuccessBanner';
import { Card } from '../../../components/common/Card';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Money } from '../../../components/common/Money';
import { useProfile } from '../../../hooks/useProfile';
import { useAccount } from '../../../hooks/useAccount';
import { updateMyProfile } from '../../../services/profiles';
import { signOut } from '../../../services/auth';
import { initialsFromName } from '../../../utils/format';
import { isNonEmpty, isValidPhone, phoneInvalidMessage, phoneRequiredMessage } from '../../../utils/validation';

/**
 * Customer profile tab (Phase 13).
 * - View + edit full_name and phone only.
 * - Email, role, balance, account number, account status are read-only.
 * - Sign out button at the bottom.
 */
export default function CustomerProfileTab() {
  const router = useRouter();
  const { profile, loading, errorMessage, reload } = useProfile();
  const { account } = useAccount();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.body}>
          <LoadingState label="Loading profile…" />
        </View>
      </SafeAreaView>
    );
  }
  if (errorMessage || !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.body}>
          <ErrorState
            title="Profile unavailable"
            message={errorMessage ?? 'Profile not found.'}
            onRetry={reload}
          />
        </View>
      </SafeAreaView>
    );
  }

  const phoneCheck = (() => {
    if (!phone.trim()) return { ok: true }; // phone is optional in UI
    if (!isValidPhone(phone)) return { ok: false, message: phoneInvalidMessage };
    return { ok: true };
  })();

  const canSave =
    isNonEmpty(fullName) &&
    phoneCheck.ok &&
    (fullName !== profile.full_name || phone !== (profile.phone ?? '')) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    const res = await updateMyProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
    });
    setSaving(false);
    if (res.errorMessage) {
      setSaveError(res.errorMessage);
      return;
    }
    setSavedAt(Date.now());
  }

  function handleSignOut() {
    setShowSignOutConfirm(true);
  }

  async function performSignOut() {
    setShowSignOutConfirm(false);
    setSigningOut(true);
    const { errorMessage } = await signOut();
    setSigningOut(false);
    if (errorMessage) {
      setSaveError(errorMessage);
      return;
    }
    router.replace(ROUTES.login);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarMark}>{initialsFromName(profile.full_name)}</Text>
          </View>
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.email}>{profile.email ?? '—'}</Text>
          <View
            style={[
              styles.rolePill,
              profile.role === 'admin' ? styles.roleAdmin : styles.roleCustomer,
            ]}
          >
            <Text
              style={[
                styles.rolePillText,
                profile.role === 'admin' ? styles.roleAdminText : styles.roleCustomerText,
              ]}
            >
              {profile.role === 'admin' ? 'Admin' : 'Verified customer'}
            </Text>
          </View>
        </View>

        {account ? (
          <Card variant="surface">
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Current balance</Text>
              <Money value={account.balance} size="large" />
              <Text style={styles.balanceMeta}>{account.account_number}</Text>
              {account.branch ? (
                <Text style={styles.branchMeta}>
                  Branch: {account.branch.name} ({account.branch.district})
                </Text>
              ) : null}
            </View>
          </Card>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit profile</Text>

          <AuthInput
            label="Full name"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              setSaveError(null);
              setSavedAt(null);
            }}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Your full name"
            editable={!saving}
            accessibilityHint="Cannot change email, role or account details"
          />

          <AuthInput
            label="Phone"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setSaveError(null);
              setSavedAt(null);
            }}
            keyboardType="phone-pad"
            placeholder="e.g. +8801XXXXXXXXX"
            editable={!saving}
            error={!phoneCheck.ok ? phoneCheck.message ?? null : null}
            accessibilityHint="Optional contact number"
          />

          <FormErrorBanner message={saveError} />
          <FormSuccessBanner
            message={savedAt && Date.now() - savedAt < 4000 ? 'Profile updated.' : null}
          />

          <AuthButton
            title="Save changes"
            onPress={handleSave}
            loading={saving}
            disabled={!canSave}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account information (read-only)</Text>
          <Card>
            <ReadOnlyRow label="Email" value={profile.email ?? '—'} />
            <Divider />
            <ReadOnlyRow
              label="Role"
              value={profile.role === 'admin' ? 'Administrator' : 'Customer'}
            />
            {account ? (
              <>
                <Divider />
                <ReadOnlyRow label="Account number" value={account.account_number} />
                <Divider />
                <ReadOnlyRow
                  label="Account status"
                  value={account.status[0].toUpperCase() + account.status.slice(1)}
                />
              </>
            ) : null}
          </Card>
          <Text style={styles.helper}>
            For security, some account details can only be updated by SmartBank support.
          </Text>
        </View>

        <View style={styles.section}>
          <AuthButton
            title="Sign out"
            onPress={handleSignOut}
            variant="secondary"
            loading={signingOut}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Sign out?"
        message="You will need to sign in again to use SmartBank."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        loading={signingOut}
        onConfirm={performSignOut}
        onCancel={() => (signingOut ? null : setShowSignOutConfirm(false))}
      />
    </SafeAreaView>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  headerRow: { paddingTop: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  profileBlock: { alignItems: 'center', marginTop: spacing.md },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMark: { color: colors.primaryDark, fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  email: { fontSize: typography.body.size, color: colors.textMuted, marginTop: 2 },
  rolePill: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleCustomer: { backgroundColor: colors.successBg },
  roleAdmin: { backgroundColor: colors.primaryLight },
  rolePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  roleCustomerText: { color: colors.success },
  roleAdminText: { color: colors.primaryDark },
  balanceRow: { gap: 2 },
  balanceLabel: { fontSize: typography.label.size, color: colors.textMuted },
  balanceMeta: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 2 },
  branchMeta: { fontSize: typography.helper.size, color: colors.primaryDark, marginTop: 2, fontWeight: '600' },
  section: { marginTop: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  rowLabel: { fontSize: typography.body.size, color: colors.textMuted },
  rowValue: { fontSize: typography.body.size, color: colors.text, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border },
  helper: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: spacing.sm },
});