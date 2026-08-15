import { Ionicons } from '@expo/vector-icons';
import { BalanceHeader } from '@features/balance/components/BalanceHeader';
import { useBalance } from '@features/balance/hooks';
import { Debt } from '@features/debts/api';
import { DebtCard } from '@features/debts/components/DebtCard';
import { SettleModal } from '@features/debts/components/SettleModal';
import { useDebts } from '@features/debts/hooks';
import { useActivePeriod } from '@features/periods/hooks';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import React, { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function DashboardScreen() {
    const { period, isLoading: isPeriodLoading } = useActivePeriod();
    const activePeriodId = period?.id;

    const { balance, spendingProgress, isLoading: isBalanceLoading, topUp } = useBalance(activePeriodId);
    const { debts, isLoading: isDebtsLoading, settleDebt } = useDebts();
    const format = useCurrencyStore((state) => state.format);

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [topUpModalVisible, setTopUpModalVisible] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');

    const handleTopUpSubmit = async () => {
        const amount = parseFloat(topUpAmount);
        if (!isNaN(amount) && amount > 0) {
            await topUp({ amount });
            setTopUpAmount('');
            setTopUpModalVisible(false);
        }
    };

    const openDebts = debts.filter((d) => d.status !== 'settled');

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing || isBalanceLoading || isDebtsLoading || isPeriodLoading}
                    onRefresh={() => setRefreshing(false)}
                    tintColor={tokens.colors.dark.primary}
                />
            }
        >
            {/* Balance Header & Period Info */}
            <View>
                <View style={styles.periodBanner}>
                    <View style={styles.periodTitleRow}>
                        <Ionicons name="calendar-outline" size={18} color={tokens.colors.dark.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.periodName}>{period ? period.name : 'No Active Period'}</Text>
                    </View>
                    <Pressable
                        style={[styles.topUpButton, !activePeriodId && styles.disabledBtn]}
                        onPress={() => setTopUpModalVisible(true)}
                        disabled={!activePeriodId}
                    >
                        <Ionicons name="add-circle-outline" size={16} color={tokens.colors.dark.onPrimary} style={{ marginRight: 4 }} />
                        <Text style={styles.topUpButtonText}>Top Up</Text>
                    </Pressable>
                </View>
                <BalanceHeader balance={balance} progress={spendingProgress} />
            </View>

            {/* Active Debts Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>ACTIVE DEBTS ({openDebts.length})</Text>
                    <Ionicons name="swap-horizontal" size={18} color={tokens.colors.dark.onSurfaceVariant} />
                </View>
                {openDebts.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="checkmark-done-circle-outline" size={36} color={tokens.colors.dark.primary} />
                        <Text style={styles.emptyText}>All debts are fully settled!</Text>
                    </View>
                ) : (
                    openDebts.map((debt) => (
                        <DebtCard
                            key={debt.id}
                            personName={debt.person?.name || 'Contact'}
                            amount={Number(debt.amount)}
                            direction={debt.direction}
                            status={debt.status}
                            onPress={() => setSelectedDebt(debt)}
                        />
                    ))
                )}
            </View>

            {/* Settle Debt Modal */}
            {selectedDebt && (
                <SettleModal
                    visible={Boolean(selectedDebt)}
                    personName={selectedDebt.person?.name || 'Contact'}
                    amount={Number(selectedDebt.amount)}
                    onClose={() => setSelectedDebt(null)}
                    onConfirm={async (mode: 'from_balance' | 'separately') => {
                        if (activePeriodId && selectedDebt) {
                            await settleDebt({
                                debtId: selectedDebt.id,
                                amount: Number(selectedDebt.amount),
                                mode,
                                periodId: activePeriodId,
                            });
                        }
                    }}
                />
            )}

            {/* Top Up Modal */}
            <Modal visible={topUpModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalTitleRow}>
                            <Ionicons name="add-circle" size={24} color={tokens.colors.dark.primary} />
                            <Text style={styles.modalTitle}>Add Pocket Money Top Up</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder={`Amount (${format(0).charAt(0)})`}
                            placeholderTextColor={tokens.colors.dark.outline}
                            value={topUpAmount}
                            onChangeText={setTopUpAmount}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setTopUpModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.confirmBtn} onPress={handleTopUpSubmit}>
                                <Text style={styles.confirmBtnText}>Add</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.dark.background,
    },
    content: {
        padding: tokens.spacing.containerPadding,
        paddingBottom: 100,
        gap: tokens.spacing.sectionMargin,
    },
    periodBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    periodTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    periodName: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.onSurface,
    },
    topUpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tokens.colors.dark.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: tokens.radius.default,
    },
    disabledBtn: {
        opacity: 0.5,
    },
    topUpButtonText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onPrimary,
    },
    section: {
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    emptyCard: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        padding: 24,
        borderRadius: tokens.radius.md,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    emptyText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.outline,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        padding: tokens.spacing.containerPadding,
    },
    modalContainer: {
        backgroundColor: tokens.colors.dark.surfaceContainer,
        borderRadius: tokens.radius.hero,
        padding: tokens.spacing.containerPadding,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    modalTitle: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.onSurface,
    },
    input: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        color: tokens.colors.dark.onSurface,
        padding: 14,
        borderRadius: tokens.radius.md,
        fontSize: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    cancelBtnText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    confirmBtn: {
        backgroundColor: tokens.colors.dark.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: tokens.radius.default,
    },
    confirmBtnText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onPrimary,
        fontWeight: '600',
    },
});