import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthInput } from '../../components/auth/AuthInput';
import { colors } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { signUp } from '../../services/auth';
import {
  clearFieldError,
  isNonEmpty,
  isValidEmail,
  isValidPhone,
  passwordsMatch,
  validatePassword,
} from '../../utils/validation';

type FieldKey = 'fullName' | 'phone' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldKey, string>>;

const SUCCESS_REDIRECT_MS = 1200;

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  const canSubmit = useMemo(() => {
    return (
      isNonEmpty(fullName) &&
      isValidPhone(phone) &&
      isValidEmail(email) &&
      validatePassword(password).ok &&
      passwordsMatch(password, confirmPassword) &&
      !loading
    );
  }, [fullName, phone, email, password, confirmPassword, loading]);

  function clearOn(key: FieldKey) {
    setFieldErrors((prev) => clearFieldError(prev, key));
    setFormError(null);
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!isNonEmpty(fullName)) errs.fullName = 'Full name is required.';
    if (!isNonEmpty(phone)) errs.phone = 'Phone number is required.';
    else if (!isValidPhone(phone))
      errs.phone = 'Please enter a valid phone number.';
    if (!isValidEmail(email))
      errs.email = 'Please enter a valid email address.';
    const pwd = validatePassword(password);
    if (!pwd.ok) errs.password = pwd.message;
    if (!passwordsMatch(password, confirmPassword))
      errs.confirmPassword = 'Passwords do not match.';
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
    const result = await signUp({ fullName, phone, email, password });
    setLoading(false);

    if (result.errorMessage) {
      setFormError(result.errorMessage);
      return;
    }
    // Keep loading=true during the redirect window so the form stays
    // disabled and the user can't fire another signUp while we wait.
    setLoading(true);
    setSuccess(true);
    successTimerRef.current = setTimeout(() => {
      router.replace(ROUTES.login);
    }, SUCCESS_REDIRECT_MS);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Join SmartBank and open your simulated savings account.
          </Text>

          <AuthInput
            label="Full Name"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              clearOn('fullName');
            }}
            placeholder="Your full name"
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            error={fieldErrors.fullName ?? null}
            editable={!loading}
          />

          <AuthInput
            label="Phone"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              clearOn('phone');
            }}
            placeholder="e.g. +8801XXXXXXXXX"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={fieldErrors.phone ?? null}
            editable={!loading}
          />

          <AuthInput
            label="Email"
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
            error={fieldErrors.email ?? null}
            editable={!loading}
          />

          <AuthInput
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              clearOn('password');
            }}
            placeholder="At least 8 characters"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
            textContentType="newPassword"
            error={fieldErrors.password ?? null}
            editable={!loading}
          />

          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              clearOn('confirmPassword');
            }}
            placeholder="Re-enter your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
            textContentType="newPassword"
            error={fieldErrors.confirmPassword ?? null}
            editable={!loading}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Hide passwords' : 'Show passwords'
            }
            onPress={() => setShowPassword((s) => !s)}
            style={styles.toggleRow}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {showPassword ? 'Hide passwords' : 'Show passwords'}
            </Text>
          </Pressable>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          {success ? (
            <Text style={styles.success}>
              Account created. Taking you to the login screen…
            </Text>
          ) : null}

          <AuthButton
            title="Create account"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
          />

          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text
              accessibilityRole="link"
              style={styles.footerLink}
              onPress={() => router.replace(ROUTES.login)}
            >
              Login
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 28,
  },
  toggleRow: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  toggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  formError: {
    backgroundColor: colors.errorBg,
    color: colors.error,
    fontSize: 13,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  success: {
    backgroundColor: colors.successBg,
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});