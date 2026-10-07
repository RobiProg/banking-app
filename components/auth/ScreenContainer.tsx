import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';

type ScreenContainerProps = {
  children: React.ReactNode;
  /**
   * Whether the screen content should be scrollable. Defaults to true.
   * Forms almost always want this so the keyboard doesn't cover the submit.
   */
  scrollable?: boolean;
  /**
   * Center content vertically. Useful for short screens like the splash.
   * Ignored when `scrollable` is true.
   */
  centered?: boolean;
};

/**
 * Shared screen layout: SafeAreaView + KeyboardAvoidingView + optional
 * ScrollView. Keeps padding, background, and keyboard behaviour consistent
 * across the auth and customer flows.
 */
export function ScreenContainer({
  children,
  scrollable = true,
  centered = false,
}: ScreenContainerProps) {
  const contentStyle = scrollable
    ? styles.scrollContent
    : [styles.flexContent, centered ? styles.centered : null];

  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={contentStyle as object}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyle as object}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {inner}
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
  flexContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  centered: {
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
});