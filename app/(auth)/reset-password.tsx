import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { FormSuccessBanner } from '../../components/auth/FormSuccessBanner';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { resetPasswordForEmail } from '../../services/auth';
import { isValidEmail } from '../../utils/validation';

/**
 * Password Reset Screen (SRS v2.1 FR-AUTH-04, TC-19).
 * Initiates Supabase Auth password reset email.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setLoading(true);

    const res = await resetPasswordForEmail(email);
    setLoading(false);

    if (res.errorMessage) {
      setError(res.errorMessage);
      return;
    }

    setSent(true);
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your registered email address and we will send you instructions to reset your password.
      </Text>

      {sent ? (
        <View style={styles.successBox}>
          <View style={styles.iconPlate}>
            <Text style={styles.icon}>✉</Text>
          </View>
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successBody}>
            We have sent password reset instructions to <Text style={styles.bold}>{email}</Text>. Please follow the link in the email.
          </Text>
          <View style={styles.spacer} />
          <AuthButton
            title="Return to Sign In"
            onPress={() => router.replace(ROUTES.login)}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <AuthInput
            label="Email Address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <FormErrorBanner message={error} />

          <AuthButton
            title="Send Reset Link"
            onPress={handleReset}
            loading={loading}
            disabled={!email.trim()}
          />

          <Text style={styles.footerText}>
            Remember your password?{' '}
            <Text
              accessibilityRole="link"
              style={styles.footerLink}
              onPress={() => router.replace(ROUTES.login)}
            >
              Sign In
            </Text>
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.title.size,
    fontWeight: typography.title.weight,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.subtitle.size,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  form: {
    gap: spacing.sm,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  iconPlate: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 28,
    color: colors.primary,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  successBody: {
    fontSize: typography.body.size,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: colors.text,
  },
  spacer: {
    height: spacing.md,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
