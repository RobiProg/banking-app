import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Card } from '../../components/common/Card';
import { AuthButton } from '../../components/auth/AuthButton';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../hooks/useAccount';
import { maskAccountNumber } from '../../utils/format';

/**
 * Notice Screen: Customer Self-Deposit Disabled (BR-01, FR-DEP-01, TC-10).
 * Under SRS v2.1, arbitrary self-deposits are prohibited. Cash deposits
 * must be recorded by an authorized branch teller.
 */
export default function DepositScreen() {
  const router = useRouter();
  const { account } = useAccount();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Cash Deposit" subtitle="Branch Counter Policy" />

      <View style={styles.body}>
        <Card style={styles.noticeCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>ℹ</Text>
          </View>

          <Text style={styles.noticeTitle}>In-Branch Deposit Only</Text>
          <Text style={styles.noticeBody}>
            Under SmartBank financial integrity rules (SRS v2.1 BR-01), customers cannot directly increase their balance through self-deposit.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.methodsHeader}>How to add funds to your account:</Text>

          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepText}>
              <Text style={styles.bold}>Branch Counter Deposit:</Text> Visit your assigned branch ({account?.branch?.name ?? 'Motijheel Main Branch'}) where an authorized teller or administrator can process your simulated cash deposit.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepText}>
              <Text style={styles.bold}>Internal Transfer:</Text> Another SmartBank account holder can transfer funds to your account ({maskAccountNumber(account?.account_number)}).
            </Text>
          </View>
        </Card>

        <View style={styles.ctaContainer}>
          <AuthButton
            title="Return to Dashboard"
            onPress={() => router.replace(ROUTES.customer)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  noticeCard: {
    padding: spacing.lg,
    borderRadius: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '700',
  },
  noticeTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.title.weight,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  noticeBody: {
    fontSize: typography.body.size,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  methodsHeader: {
    fontSize: typography.label.size,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: typography.body.size,
    color: colors.text,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  ctaContainer: {
    marginTop: spacing.lg,
  },
});