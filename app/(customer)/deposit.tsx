import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../constants/colors';
import { radius, spacing } from '../../constants/layout';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../hooks/useAccount';
import { maskAccountNumber } from '../../utils/format';

/**
 * Notice Screen: Customer Self-Deposit Disabled (BR-01, FR-DEP-01, TC-10).
 * Matches Figma §31 & SRS v2.2. Explains in-branch counter deposit workflow.
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
            <Icon name="bank" size={28} color={colors.primary} />
          </View>

          <Text style={styles.noticeTitle}>In-Branch Deposit Only</Text>
          <Text style={styles.noticeBody}>
            Under SmartBank financial integrity rules (SRS v2.2 BR-01), customers cannot directly increase their balance through self-deposit.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.methodsHeader}>How to add funds to your account:</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Branch Counter Deposit</Text>
              <Text style={styles.stepDesc}>
                Visit your assigned branch counter ({account?.branch?.name ?? 'Dhaka Motijheel Main Branch'}), where an authorized teller will accept physical currency and credit your account immediately.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Internal P2P Transfer</Text>
              <Text style={styles.stepDesc}>
                Another SmartBank customer can transfer funds instantly to your account number ({maskAccountNumber(account?.account_number)}).
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.ctaContainer}>
          <Button
            title="Return to Dashboard"
            onPress={() => router.replace(ROUTES.customer)}
            size="lg"
            variant="primary"
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
    padding: spacing.base,
    justifyContent: 'space-between',
  },
  noticeCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  noticeBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  methodsHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  ctaContainer: {
    paddingVertical: spacing.sm,
  },
});
