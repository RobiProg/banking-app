import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/layout';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

/**
 * Simple native confirm dialog. We avoid pulling a third-party modal
 * library for a university demo. Used before every financial op
 * (deposit / withdraw / transfer / admin status change) per plan §19.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityLabel={`${title}. ${message}`}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              onPress={onCancel}
              disabled={loading}
              style={({ pressed }) => [
                styles.btn,
                styles.btnSecondary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnSecondaryLabel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ busy: loading }}
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.btn,
                destructive ? styles.btnDestructive : styles.btnPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.btnPrimaryLabel,
                  destructive ? styles.btnDestructiveLabel : null,
                ]}
              >
                {loading ? 'Working…' : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 43, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.body.size,
    color: colors.textMuted,
    lineHeight: typography.body.size * 1.45,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryLabel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: typography.body.size,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnDestructive: {
    backgroundColor: colors.error,
  },
  btnPrimaryLabel: {
    color: colors.textOnPrimary,
    fontWeight: '600',
    fontSize: typography.body.size,
  },
  btnDestructiveLabel: {
    color: colors.textOnPrimary,
  },
  pressed: { opacity: 0.85 },
});