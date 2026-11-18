import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Icon } from '../../../components/ui/Icon';
import { TextInput } from '../../../components/ui/TextInput';
import { colors } from '../../../constants/colors';
import { radius, shadows, spacing, typography } from '../../../constants/layout';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { EmptyState } from '../../../components/common/EmptyState';
import {
  createBranch,
  listAllBranches,
  updateBranch,
  type CreateBranchParams,
} from '../../../services/branches';
import type { Branch } from '../../../types/db';

type StatusFilter = 'all' | 'active' | 'inactive';

/**
 * Branch Management Tab (SRS v2.2 FR-ADM-06, FR-BR-01, FR-BR-02).
 * Styled to match SmartBank Figma UI design system.
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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Branch Network</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Loading…' : `${branches.length} registered branches in Bangladesh`}
          </Text>
        </View>
        <Button
          title="Add Branch"
          variant="primary"
          size="sm"
          icon="plus"
          onPress={() => setShowAddModal(true)}
        />
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchWrap}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by branch name, district, or code"
            leftIcon="search"
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
            <Card variant="surface" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.branchName}>{item.name}</Text>
                  <Text style={styles.branchDistrict}>
                    {item.district} District • Code: {item.branch_code}
                  </Text>
                </View>
                <Badge
                  label={item.is_active ? 'ACTIVE' : 'INACTIVE'}
                  variant={item.is_active ? 'success' : 'neutral'}
                />
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
                <Button
                  title={
                    togglingId === item.id
                      ? 'Updating…'
                      : item.is_active
                      ? 'Deactivate'
                      : 'Activate'
                  }
                  variant={item.is_active ? 'outline' : 'primary'}
                  size="sm"
                  disabled={togglingId === item.id}
                  onPress={() => handleToggleStatus(item)}
                />
              </View>
            </Card>
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
                <Icon name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: spacing.base }} showsVerticalScrollIndicator={false}>
              <Text style={styles.formHint}>
                Add a new designated branch location for customer accounts and branch cash deposits.
              </Text>

              {formError ? <Text style={styles.modalError}>{formError}</Text> : null}

              <TextInput
                label="Branch Name *"
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Dhanmondi Branch"
                editable={!submitting}
              />

              <TextInput
                label="Branch Code * (e.g. SB-DHK-003)"
                value={formCode}
                onChangeText={(t) => setFormCode(t.toUpperCase())}
                placeholder="e.g. SB-DHK-003"
                autoCapitalize="characters"
                editable={!submitting}
              />

              <TextInput
                label="District * (e.g. Dhaka, Chittagong, Sylhet)"
                value={formDistrict}
                onChangeText={setFormDistrict}
                placeholder="e.g. Dhaka"
                editable={!submitting}
              />

              <TextInput
                label="Routing Code (Optional)"
                value={formRouting}
                onChangeText={setFormRouting}
                placeholder="e.g. 01026003"
                keyboardType="numeric"
                editable={!submitting}
              />

              <TextInput
                label="Physical Address (Optional)"
                value={formAddress}
                onChangeText={setFormAddress}
                placeholder="e.g. House 14, Road 8, Dhanmondi, Dhaka"
                multiline
                numberOfLines={2}
                editable={!submitting}
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAddModal(false)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Create Branch"
                  variant="primary"
                  loading={submitting}
                  onPress={handleCreateBranch}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.caption.size,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchWrap: {
    marginBottom: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  pressed: {
    opacity: 0.85,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  branchDistrict: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardDetail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  codeText: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cardAddress: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  cardActions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 43, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
    gap: spacing.md,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  modalError: {
    fontSize: 13,
    color: colors.error,
    backgroundColor: colors.errorBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.base,
  },
});
