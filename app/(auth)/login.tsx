import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthButton } from '../../components/auth/AuthButton';
import { AuthInput } from '../../components/auth/AuthInput';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { getSessionWithProfile, signIn } from '../../services/auth';
import {
  clearFieldError,
  isNonEmpty,
  isValidEmail,
  validatePassword,
} from '../../utils/validation';

type FieldKey = 'email' | 'password';
type FieldErrors = Partial<Record<FieldKey, string>>;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const canSubmit = useMemo(() => {
    return (
      isNonEmpty(email) &&
      isValidEmail(email) &&
      validatePassword(password).ok &&
      !loading
    );
  }, [email, password, loading]);

  function clearOn(key: FieldKey) {
    setFieldErrors((prev) => clearFieldError(prev, key));
    setFormError(null);
  }

  async function handleSubmit() {
    const errs: FieldErrors = {};
    if (!isValidEmail(email)) errs.email = 'Please enter a valid email address.';
    const pwd = validatePassword(password);
    if (!pwd.ok) errs.password = pwd.message;
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    const result = await signIn({ email, password });

    if (result.errorMessage) {
      setLoading(false);
      setFormError(result.errorMessage);
      return;
    }

    const lookup = await getSessionWithProfile();
    setLoading(false);

    if (lookup.profile?.role === 'admin') {
      router.replace(ROUTES.adminDashboard);
    } else {
      router.replace(ROUTES.customer);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>
        Sign in to access your SmartBank account.
      </Text>

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
        placeholder="Enter your password"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        error={fieldErrors.password ?? null}
        editable={!loading}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        accessibilityState={{ selected: showPassword }}
        onPress={() => setShowPassword((s) => !s)}
        style={styles.toggleRow}
        disabled={loading}
      >
        <Text style={styles.toggleText}>
          {showPassword ? 'Hide password' : 'Show password'}
        </Text>
      </Pressable>

      <FormErrorBanner message={formError} />

      <AuthButton
        title="Login"
        onPress={handleSubmit}
        loading={loading}
        disabled={!canSubmit}
        accessibilityHint="Signs you in and opens your accounts"
      />

      <Text style={styles.footerText}>
        Don&apos;t have an account?{' '}
        <Text
          accessibilityRole="link"
          style={styles.footerLink}
          onPress={() => router.push(ROUTES.register)}
        >
          Create account
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