import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Icon, IconName } from '../../../components/ui/Icon';
import { TextInput } from '../../../components/ui/TextInput';
import { colors } from '../../../constants/colors';
import { radius, spacing } from '../../../constants/layout';
import { ROUTES } from '../../../constants/routes';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { FormErrorBanner } from '../../../components/auth/FormErrorBanner';
import { FormSuccessBanner } from '../../../components/auth/FormSuccessBanner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useProfile } from '../../../hooks/useProfile';
import { useAccount } from '../../../hooks/useAccount';
import { updateMyProfile } from '../../../services/profiles';
import { signOut } from '../../../services/auth';
import { isNonEmpty, isValidPhone, phoneInvalidMessage } from '../../../utils/validation';

/**
 * Customer Profile & Settings Screen. Matches Figma §14.
 * Profile header with 80pt avatar, KYC status pill, personal details edit,
 * banking overview, and sign-out dialog.
 */
export default function CustomerProfileTab() {
  const router = useRouter();
  const { profile, loading, errorMessage, reload } = useProfile();
  const { account } = useAccount();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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
    if (!phone.trim()) return { ok: true };
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
    setIsEditing(false);
  }

  async function handleConfirmSignOut() {
    setShowSignOutConfirm(false);
    setSigningOut(true);
    await signOut();
    router.replace(ROUTES.login);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Profile & Settings</Text>

        {/* Profile Header (§14: 80pt avatar, name, email, verified pill) */}
        <View style={styles.profileHeader}>
          <Avatar name={profile.full_name} size={80} verified />
          <Text style={styles.userName}>{profile.full_name}</Text>
          <Text style={styles.userEmail}>{profile.email}</Text>
          <View style={styles.badgeRow}>
            <Badge label="Verified Customer" variant="success" icon="check" />
          </View>
        </View>

        {/* Section 1: Personal Information Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal details</Text>
            {!isEditing ? (
              <Pressable
                onPress={() => setIsEditing(true)}
                hitSlop={8}
                style={styles.editToggle}
              >
                <Text style={styles.editToggleText}>Edit</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setFullName(profile.full_name);
                  setPhone(profile.phone ?? '');
                  setIsEditing(false);
                }}
                hitSlop={8}
                style={styles.editToggle}
              >
                <Text style={styles.cancelToggleText}>Cancel</Text>
              </Pressable>
            )}
          </View>

          <Card variant="default">
            {isEditing ? (
              <View>
                <TextInput
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  leftIcon="user"
                />
                <TextInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  leftIcon="phone"
                  keyboardType="phone-pad"
                  error={!phoneCheck.ok ? phoneCheck.message : null}
                />
                <FormErrorBanner message={saveError} />
                <FormSuccessBanner
                  message={savedAt ? 'Profile updated successfully.' : null}
                />
                <Button
                  title="Save changes"
                  onPress={handleSave}
                  loading={saving}
                  disabled={!canSave}
                  size="md"
                />
              </View>
            ) : (
              <View style={styles.infoList}>
                <InfoRow label="Full name" value={profile.full_name} icon="user" />
                <View style={styles.rowDivider} />
                <InfoRow label="Email" value={profile.email || 'Not registered'} icon="mail" />
                <View style={styles.rowDivider} />
                <InfoRow
                  label="Phone"
                  value={profile.phone || 'Not registered'}
                  icon="phone"
                />
              </View>
            )}
          </Card>
        </View>

        {/* Section 2: Banking & Branch Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Banking & accounts</Text>
          <Card variant="surface">
            <View style={styles.infoList}>
              <InfoRow
                label="Account type"
                value="Simulated Savings (BDT)"
                icon="bank"
              />
              <View style={styles.rowDivider} />
              <InfoRow
                label="Home branch"
                value={account?.branch?.name ?? 'Assigned branch'}
                icon="bank"
              />
              <View style={styles.rowDivider} />
              <InfoRow
                label="Account status"
                value={account?.status ? account.status.toUpperCase() : 'ACTIVE'}
                icon="shield"
              />
            </View>
          </Card>
        </View>

        {/* Section 3: Preferences & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Card variant="default">
            <Pressable
              style={styles.menuRow}
              onPress={() =>
                Alert.alert(
                  'Biometric Security',
                  'Face ID and biometric confirmation is active for transactions.',
                  [{ text: 'OK' }]
                )
              }
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconPlate}>
                  <Icon name="biometrics" size={18} color={colors.primary} />
                </View>
                <Text style={styles.menuLabel}>Biometric login & transfers</Text>
              </View>
              <Badge label="Enabled" variant="primary" />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => router.push(ROUTES.notifications)}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconPlate}>
                  <Icon name="bell" size={18} color={colors.primary} />
                </View>
                <Text style={styles.menuLabel}>Transaction alerts</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textSecondary} />
            </Pressable>
          </Card>
        </View>

        {/* Sign Out Button (§14) */}
        <View style={styles.signOutWrap}>
          <Button
            title="Sign out"
            variant="outline"
            icon="logout"
            onPress={() => setShowSignOutConfirm(true)}
            loading={signingOut}
            style={styles.signOutBtn}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Sign out of SmartBank?"
        message="You will need to enter your email and password to access your account again."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
        destructive
      />
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: IconName;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Icon name={icon} size={16} color={colors.textSecondary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  screenTitle: {
    fontSize: 24, // Figma specification: 24 pt bold
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userName: {
    fontSize: 18, // 18 pt weight 600
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  editToggle: {
    padding: spacing.xs,
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  cancelToggleText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoList: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '55%',
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuIconPlate: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  signOutWrap: {
    marginTop: spacing.lg,
  },
  signOutBtn: {
    borderColor: colors.errorBorder,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
