import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormErrorBanner } from '../../components/auth/FormErrorBanner';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { TextInput } from '../../components/ui/TextInput';
import { colors } from '../../constants/colors';
import { radius, spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { resetPasswordForEmail } from '../../services/auth';
import { isValidEmail } from '../../utils/validation';

/**
 * Password Recovery Screen. Matches Figma §2 / SRS v2.2 FR-AUTH-04.
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
        <Text style={styles.topBarTitle}>Recovery</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address and we will send you secure instructions to reset your password.
        </Text>
      </View>

      {sent ? (
        <View style={styles.successBox}>
          <View style={styles.iconPlate}>
            <Icon name="mail" size={28} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successBody}>
            We have sent password reset instructions to{' '}
            <Text style={styles.bold}>{email}</Text>. Please follow the link in the message.
          </Text>
          <View style={styles.spacer} />
          <Button
            title="Return to sign in"
            onPress={() => router.replace(ROUTES.login)}
            size="lg"
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            label="Email address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail"
            editable={!loading}
          />

          <FormErrorBanner message={error} />

          <Button
            title="Send reset link"
            onPress={handleReset}
            loading={loading}
            disabled={!email.trim()}
            size="lg"
            accessibilityHint="Dispatches a recovery email"
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remember your password?</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Sign in"
              onPress={() => router.replace(ROUTES.login)}
              hitSlop={8}
            >
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      )}
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
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
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
  form: {
    marginBottom: spacing.xl,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconPlate: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  successBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  spacer: {
    height: spacing.xl,
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
