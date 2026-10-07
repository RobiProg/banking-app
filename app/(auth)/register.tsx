import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthInput } from '../../components/auth/AuthInput';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { FormSuccessBanner } from '../../components/auth/FormSuccessBanner';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { signUp as signUpService } from '../../services/auth';
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
const SUCCESS_MESSAGE = 'Account created. Taking you to the login screen...';
const PASSWORD_HINT_MESSAGE = 'Use 8 or more characters';

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

  const passwordCheck = useMemo(() => validatePassword(password), [password]);
  const showPasswordHint =
    password.length > 0 && !passwordCheck.ok;

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
    const result = await signUpService({ fullName, phone, email, password });
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
    <ScreenContainer>
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

      {showPasswordHint ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.passwordHint}
        >
          {PASSWORD_HINT_MESSAGE}
        </Text>
      ) : null}

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
        accessibilityState={{ selected: showPassword }}
        onPress={() => setShowPassword((s) => !s)}
        style={styles.toggleRow}
        disabled={loading}
      >
        <Text style={styles.toggleText}>
          {showPassword ? 'Hide passwords' : 'Show passwords'}
        </Text>
      </Pressable>

      <FormErrorBanner message={formError} />
      <FormSuccessBanner message={success ? SUCCESS_MESSAGE : null} />

      <AuthButton
        title="Create account"
        onPress={handleSubmit}
        loading={loading}
        disabled={!canSubmit}
        accessibilityHint="Creates your SmartBank account"
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.title.size,
    fontWeight: typography.title.weight,
    color: colors.text,
    marginBottom: spacing.xs + 2, // 6
  },
  subtitle: {
    fontSize: typography.subtitle.size,
    color: colors.textMuted,
    marginBottom: spacing.lg + spacing.xs, // 28
    lineHeight: typography.subtitle.size * 1.4,
  },
  toggleRow: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  toggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  passwordHint: {
    color: colors.textMuted,
    fontSize: typography.helper.size,
    marginTop: -spacing.sm, // tuck under the password field
    marginBottom: spacing.md,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    textAlign: 'center',
    marginTop: spacing.lg - spacing.xs, // 20
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});