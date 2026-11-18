import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { TextInput } from '../../components/ui/TextInput';
import { colors } from '../../constants/colors';
import { radius, spacing, typography } from '../../constants/layout';
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

/**
 * Mobile Banking Login Screen. Matches Figma §2.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  function handleBiometrics() {
    Alert.alert(
      'Biometric Sign In',
      'Quick login with Face ID / Touch ID will authenticate using your saved credentials.',
      [{ text: 'OK' }]
    );
  }

  return (
    <ScreenContainer>
      {/* Brand Badge */}
      <View style={styles.topLogoRow}>
        <View style={styles.miniLogo}>
          <Icon name="shield" size={18} color={colors.primary} />
        </View>
        <Text style={styles.logoLabel}>SmartBank</Text>
      </View>

      {/* Top Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to access your SmartBank account.</Text>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
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
          label="Password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            clearOn('password');
          }}
          placeholder="Enter your password"
          isPassword
          leftIcon="lock"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          error={fieldErrors.password ?? null}
          editable={!loading}
        />

        <View style={styles.forgotRow}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Forgot password?"
            onPress={() => router.push(ROUTES.resetPassword)}
            disabled={loading}
            hitSlop={8}
          >
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </Pressable>
        </View>

        <FormErrorBanner message={formError} />

        <Button
          title="Sign in"
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
          size="lg"
          accessibilityHint="Signs you in and opens your accounts"
        />

        {/* Divider with center "or" */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Biometrics Secondary Action */}
        <Button
          title="Continue with biometrics"
          variant="outline"
          icon="biometrics"
          onPress={handleBiometrics}
          disabled={loading}
          accessibilityHint="Sign in using Face ID or Touch ID"
        />
      </View>

      {/* Bottom Footer Link */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>New to SmartBank?</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Create account"
          onPress={() => router.push(ROUTES.register)}
          hitSlop={8}
        >
          <Text style={styles.footerLink}>Create account</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  miniLogo: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24, // Figma specification: 24 pt bold
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15, // Figma specification: 15 pt regular
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.xxl,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.xs,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing.base,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'lowercase',
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
});
