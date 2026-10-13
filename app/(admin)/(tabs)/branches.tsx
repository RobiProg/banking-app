import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../constants/colors';
import { spacing, typography } from '../../../constants/layout';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import { AuthInput } from '../../../components/auth/AuthInput';
import {
  createBranch,
  listAllBranches,
  updateBranch,
  type CreateBranchParams,
} from '../../../services/branches';
import type { Branch } from '../../../types/db';

type StatusFilter = 'all' | 'active' | 'inactive';

/**
 * Branch Management Tab (SRS v2.1 FR-ADM-06, FR-BR-01, FR-BR-02).
 * - Lists all bank branches with active/inactive status.
 * - Toggle branch status dynamically.
 * - Modal form to create new branch with routing code and district.
 */
export default function AdminBranchesTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  // Add Branch modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formRouting, setFormRouting] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toggling status state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listAllBranches();
    setLoading(false);
    if (res.errorMessage) setError(res.errorMessage);
    else setBranches(res.branches);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleToggleStatus(branch: Branch) {
    setTogglingId(branch.id);
    const res = await updateBranch(branch.id, { is_active: !branch.is_active });
    setTogglingId(null);
    if (!res.errorMessage) {
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, is_active: !b.is_active } : b))
      );
    }
  }

  async function handleCreateBranch() {
    if (!formName.trim() || !formCode.trim() || !formDistrict.trim()) {
      setFormError('Please fill in Branch Name, Branch Code, and District.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload: CreateBranchParams = {
      name: formName.trim(),
      branchCode: formCode.trim().toUpperCase(),
      district: formDistrict.trim(),
      routingCode: formRouting.trim() || null,
      address: formAddress.trim() || null,
      isActive: true,
    };

    const res = await createBranch(payload);
    setSubmitting(false);

    if (res.errorMessage) {
      setFormError(res.errorMessage);
      return;
    }

    // Success: reset form and reload
    setFormName('');
    setFormCode('');
    setFormDistrict('');
    setFormRouting('');
    setFormAddress('');
    setShowAddModal(false);
    reload();
  }

  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchesSearch =
        search.trim() === '' ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.district.toLowerCase().includes(search.toLowerCase()) ||
        b.branch_code.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        filter === 'all' ||
        (filter === 'active' && b.is_active) ||
        (filter === 'inactive' && !b.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [branches, search, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Branches</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Loading…' : `${branches.length} registered branches across Bangladesh`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Branch"
          onPress={() => setShowAddModal(true)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        >
          <Text style={styles.addBtnText}>+ Add Branch</Text>
        </Pressable>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchWrap}>
          <AuthInput
            label=""
            value={search}
            onChangeText={setSearch}
            placeholder="Search by branch name, district, or code"
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <View style={styles.chipsRow}>
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f}`}
              onPress={() => setFilter(f)}
              style={({ pressed }) => [
                styles.chip,
                filter === f && styles.chipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === f && styles.chipTextActive,
                ]}
              >
                {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.body}>
          <LoadingState label="Loading branches…" />
        </View>
      ) : error ? (
        <View style={styles.body}>
          <ErrorState
            title="Could not load branches"
            message={error}
            onRetry={reload}
          />
        </View>
      ) : filteredBranches.length === 0 ? (
        <View style={styles.body}>
          <EmptyState
            title="No branches found"
            message={
              search || filter !== 'all'
                ? 'No branches match the specified search or filter criteria.'
                : 'No branches registered in system yet.'
            }
          />
        </View>
      ) : (
        <FlatList
          data={filteredBranches}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.branchName}>{item.name}</Text>
                  <Text style={styles.branchDistrict}>
                    📍 {item.district} District • Code: {item.branch_code}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.is_active ? styles.statusActive : styles.statusInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.is_active ? styles.statusActiveText : styles.statusInactiveText,
                    ]}
                  >
                    {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>

              {item.routing_code ? (
                <Text style={styles.cardDetail}>
                  Routing Code: <Text style={styles.codeText}>{item.routing_code}</Text>
                </Text>
              ) : null}

              {item.address ? (
                <Text style={styles.cardAddress}>Address: {item.address}</Text>
              ) : null}

              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.is_active ? 'Deactivate branch' : 'Activate branch'}
                  disabled={togglingId === item.id}
                  onPress={() => handleToggleStatus(item)}
                  style={({ pressed }) => [
                    styles.toggleBtn,
                    item.is_active ? styles.toggleDeactivate : styles.toggleActivate,
                    pressed && styles.pressed,
                    togglingId === item.id && styles.disabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      item.is_active ? styles.toggleDeactivateText : styles.toggleActivateText,
                    ]}
                  >
                    {togglingId === item.id
                      ? 'Updating…'
                      : item.is_active
                      ? 'Deactivate'
                      : 'Activate'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Branch Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!submitting) setShowAddModal(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Branch</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setShowAddModal(false)}
                disabled={submitting}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: spacing.md }}>
              <Text style={styles.formHint}>
                Add a new designated branch location for customer accounts and branch cash deposits.
              </Text>

              {formError ? <Text style={styles.modalError}>{formError}</Text> : null}

              <Text style={styles.inputLabel}>Branch Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Dhanmondi Branch"
                placeholderTextColor={colors.textMuted}
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Branch Code * (e.g. SB-DHK-003)</Text>
              <TextInput
                style={styles.modalInput}
                value={formCode}
                onChangeText={(t) => setFormCode(t.toUpperCase())}
                placeholder="e.g. SB-DHK-003"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>District * (e.g. Dhaka, Chittagong, Sylhet)</Text>
              <TextInput
                style={styles.modalInput}
                value={formDistrict}
                onChangeText={setFormDistrict}
                placeholder="e.g. Dhaka"
                placeholderTextColor={colors.textMuted}
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Routing Code (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={formRouting}
                onChangeText={setFormRouting}
                placeholder="e.g. 01026003"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Physical Address (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                value={formAddress}
                onChangeText={setFormAddress}
                placeholder="e.g. House 14, Road 8, Dhanmondi, Dhaka"
                placeholderTextColor={colors.textMuted}
                multiline
                editable={!submitting}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={() => setShowAddModal(false)}
                  disabled={submitting}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save Branch"
                  onPress={handleCreateBranch}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    pressed && styles.pressed,
                    submitting && styles.disabled,
                  ]}
                >
                  <Text style={styles.saveBtnText}>
                    {submitting ? 'Creating…' : 'Create Branch'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: typography.helper.size, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    borderRadius: 8,
  },
  addBtnText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  filterSection: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  searchWrap: { marginBottom: spacing.xs },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.caption.size, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  branchName: { fontSize: 16, fontWeight: '700', color: colors.text },
  branchDistrict: { fontSize: typography.caption.size, color: colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusActive: { backgroundColor: colors.successBg },
  statusInactive: { backgroundColor: colors.border },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  statusActiveText: { color: colors.success },
  statusInactiveText: { color: colors.textMuted },
  cardDetail: { fontSize: typography.caption.size, color: colors.textMuted, marginTop: 4 },
  codeText: { fontWeight: '700', color: colors.text },
  cardAddress: { fontSize: typography.caption.size, color: colors.textMuted, marginTop: 4 },
  cardActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleActivate: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  toggleActivateText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleDeactivate: {
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
  },
  toggleDeactivateText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { padding: spacing.xs },
  closeText: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  formHint: {
    fontSize: typography.caption.size,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalError: {
    color: colors.error,
    fontSize: typography.caption.size,
    marginBottom: spacing.sm,
    backgroundColor: colors.errorBg,
    padding: spacing.xs + 2,
    borderRadius: 6,
  },
  inputLabel: {
    fontSize: typography.label.size,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.size,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelBtnText: { fontSize: typography.body.size, fontWeight: '600', color: colors.text },
  saveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    fontSize: typography.body.size,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
