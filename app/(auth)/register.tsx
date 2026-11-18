import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { FormSuccessBanner } from '../../components/auth/FormSuccessBanner';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { TextInput } from '../../components/ui/TextInput';
import { colors } from '../../constants/colors';
import { radius, spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { signUp as signUpService } from '../../services/auth';
import { listActiveBranches } from '../../services/branches';
import type { Branch } from '../../types/db';
import {
  clearFieldError,
  emailErrorMessage,
  fullNameRequiredMessage,
  isNonEmpty,
  isValidEmail,
  isValidPhone,
  passwordMismatchMessage,
  passwordsMatch,
  phoneInvalidMessage,
  phoneRequiredMessage,
  validatePassword,
} from '../../utils/validation';

type FieldKey = 'fullName' | 'phone' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldKey, string>>;

const SUCCESS_REDIRECT_MS = 1200;
const SUCCESS_MESSAGE = 'Account created successfully! Redirecting to sign in...';

/**
 * Mobile Banking Registration Screen. Matches Figma §3.
 * Includes 4-segment stepper, password strength bar, terms agreement,
 * and branch association (SRS v2.2 FR-AUTH-01, FR-BR-01).
 */
export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Branch Selection
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [showBranchModal, setShowBranchModal] = useState(false);

  useEffect(() => {
    async function loadBranches() {
      const res = await listActiveBranches();
      if (res.branches.length > 0) {
        setBranches(res.branches);
        setSelectedBranchId(res.branches[0].id);
      }
    }
    loadBranches();
  }, []);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) ?? branches[0],
    [branches, selectedBranchId],
  );

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  // Password strength calculation (0 to 4)
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.max(1, score);
  }, [password]);

  const passwordCheck = useMemo(() => validatePassword(password), [password]);

  const canSubmit = useMemo(() => {
    return (
      isNonEmpty(fullName) &&
      isValidPhone(phone) &&
      isValidEmail(email) &&
      validatePassword(password).ok &&
      passwordsMatch(password, confirmPassword) &&
      agreeTerms &&
      !loading
    );
  }, [fullName, phone, email, password, confirmPassword, agreeTerms, loading]);

  function clearOn(key: FieldKey) {
    setFieldErrors((prev) => clearFieldError(prev, key));
    setFormError(null);
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!isNonEmpty(fullName)) errs.fullName = fullNameRequiredMessage;
    if (!isNonEmpty(phone)) errs.phone = phoneRequiredMessage;
    else if (!isValidPhone(phone)) errs.phone = phoneInvalidMessage;
    if (!isValidEmail(email)) errs.email = emailErrorMessage;
    const pwd = validatePassword(password);
    if (!pwd.ok) errs.password = pwd.message;
    if (!passwordsMatch(password, confirmPassword))
      errs.confirmPassword = passwordMismatchMessage;
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    const result = await signUpService({
      fullName,
      phone,
      email,
      password,
      branchId: selectedBranchId || null,
    });
    setLoading(false);

    if (result.errorMessage) {
      setFormError(result.errorMessage);
      return;
    }

    setLoading(true);
    setSuccess(true);
    successTimerRef.current = setTimeout(() => {
      router.replace(ROUTES.login);
    }, SUCCESS_REDIRECT_MS);
  }

  const strengthColor = useMemo(() => {
    switch (passwordStrength) {
      case 1:
        return colors.error;
      case 2:
        return colors.warning;
      case 3:
        return '#EAB308'; // Amber
      case 4:
        return colors.success;
      default:
        return colors.border;
    }
  }, [passwordStrength]);

  return (
    <ScreenContainer>
      {/* Top Bar with Back Arrow */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>SmartBank</Text>
        <View style={styles.topBarSpacer} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>It takes about 3 minutes to open your savings account.</Text>
      </View>

      {/* Progress Stepper (§3) */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepperBars}>
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={styles.stepBar} />
          <View style={styles.stepBar} />
          <View style={styles.stepBar} />
        </View>
        <View style={styles.stepperLabels}>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Details</Text>
          <Text style={styles.stepLabel}>Verify</Text>
          <Text style={styles.stepLabel}>Set up</Text>
          <Text style={styles.stepLabel}>Done</Text>
        </View>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        <TextInput
          label="Full name"
          value={fullName}
          onChangeText={(t) => {
            setFullName(t);
            clearOn('fullName');
          }}
          placeholder="e.g. Maria Rossi"
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="name"
          textContentType="name"
          leftIcon="user"
          error={fieldErrors.fullName ?? null}
          editable={!loading}
        />

        <TextInput
          label="Email address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            clearOn('email');
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          leftIcon="mail"
          error={fieldErrors.email ?? null}
          editable={!loading}
        />

        <TextInput
          label="Phone number"
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            clearOn('phone');
          }}
          placeholder="+8801XXXXXXXXX"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          leftIcon="phone"
          error={fieldErrors.phone ?? null}
          editable={!loading}
        />

        {/* Home Branch Card Selector */}
        <View style={styles.branchField}>
          <Text style={styles.fieldLabel}>Home branch</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Home Branch: ${selectedBranch?.name ?? 'Select branch'}`}
            onPress={() => setShowBranchModal(true)}
            style={styles.branchSelector}
            disabled={loading}
          >
            <View style={styles.branchLeft}>
              <View style={styles.branchIconPlate}>
                <Icon name="bank" size={18} color={colors.primary} />
              </View>
              <View style={styles.branchTexts}>
                <Text style={styles.branchName} numberOfLines={1}>
                  {selectedBranch?.name ?? 'Loading branches...'}
                </Text>
                <Text style={styles.branchDistrict}>
                  {selectedBranch?.district ? `District: ${selectedBranch.district}` : 'Tap to change branch'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-down" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        <TextInput
          label="Password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            clearOn('password');
          }}
          placeholder="Create a strong password"
          isPassword
          leftIcon="lock"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors.password ?? null}
          editable={!loading}
        />

        {/* Password Strength Meter */}
        {password.length > 0 && (
          <View style={styles.strengthMeter}>
            <View style={styles.meterBars}>
              {[1, 2, 3, 4].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.meterBar,
                    {
                      backgroundColor:
                        passwordStrength >= level ? strengthColor : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthText, { color: strengthColor }]}>
              {passwordStrength === 1 && 'Weak password'}
              {passwordStrength === 2 && 'Fair password'}
              {passwordStrength === 3 && 'Good password'}
              {passwordStrength === 4 && 'Strong password'}
            </Text>
          </View>
        )}

        <TextInput
          label="Confirm password"
          value={confirmPassword}
          onChangeText={(t) => {
            setConfirmPassword(t);
            clearOn('confirmPassword');
          }}
          placeholder="Re-type your password"
          isPassword
          leftIcon="lock"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors.confirmPassword ?? null}
          editable={!loading}
        />

        {/* Terms of Service Checkbox Row */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreeTerms }}
          onPress={() => setAgreeTerms((prev) => !prev)}
          style={styles.termsRow}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
            {agreeTerms && <Icon name="check" size={12} color={colors.textOnPrimary} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Pressable>

        <FormErrorBanner message={formError} />
        <FormSuccessBanner message={success ? SUCCESS_MESSAGE : null} />

        <Button
          title="Create account"
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
          size="lg"
          accessibilityHint="Submits your registration and generates your savings account"
        />
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Sign in"
          onPress={() => router.replace(ROUTES.login)}
          hitSlop={8}
        >
          <Text style={styles.footerLink}>Sign in</Text>
        </Pressable>
      </View>

      {/* Branch Selection Modal */}
      <Modal
        visible={showBranchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBranchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose your home branch</Text>
              <Pressable
                onPress={() => setShowBranchModal(false)}
                hitSlop={8}
                style={styles.modalClose}
              >
                <Icon name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={branches}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedBranchId;
                return (
                  <Pressable
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setSelectedBranchId(item.id);
                      setShowBranchModal(false);
                    }}
                  >
                    <View style={styles.modalItemLeft}>
                      <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.modalItemSub}>
                        {item.district} • Code: {item.branch_code}
                      </Text>
                    </View>
                    {isSelected && <Icon name="check" size={16} color={colors.primary} />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
    marginTop: -spacing.xs,
  },
  backButton: {
    padding: spacing.xs,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  topBarSpacer: {
    width: 32,
  },
  header: {
    marginBottom: spacing.base,
  },
  title: {
    fontSize: 24, // Figma specification: 24 pt bold
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  stepperContainer: {
    marginBottom: spacing.xl,
  },
  stepperBars: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  stepBarActive: {
    backgroundColor: colors.primary,
  },
  stepperLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  stepLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  form: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: typography.label.size,
    fontWeight: typography.label.weight,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  branchField: {
    marginBottom: spacing.base,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 56,
    paddingHorizontal: spacing.base,
  },
  branchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  branchIconPlate: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  branchTexts: {
    flex: 1,
  },
  branchName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  branchDistrict: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  strengthMeter: {
    marginTop: -spacing.sm,
    marginBottom: spacing.base,
  },
  meterBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  meterBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.xs + 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 43, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemSelected: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  modalItemLeft: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalItemTitleSelected: {
    color: colors.primary,
  },
  modalItemSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
