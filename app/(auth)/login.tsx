import React, { useMemo, useState } from 'react';
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
import { signIn } from '../../services/auth';
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
    setLoading(false);

    if (result.errorMessage) {
      setFormError(result.errorMessage);
      return;
    }
    router.replace(ROUTES.app);
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
            onPress={() => setShowPassword((s) => !s)}
            style={styles.toggleRow}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {showPassword ? 'Hide password' : 'Show password'}
            </Text>
          </Pressable>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <AuthButton
            title="Login"
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
          />

          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text
              accessibilityRole="link"
              style={styles.footerLink}
              onPress={() => router.push(ROUTES.register)}
            >
              Create account
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
    paddingTop: 32,
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