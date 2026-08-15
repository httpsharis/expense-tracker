import { Ionicons } from '@expo/vector-icons';
import { usePeople } from '@features/people/hooks';
import { useActivePeriod } from '@features/periods/hooks';
import { useCreateSplit } from '@features/splits/hooks';
import { useTransactions } from '@features/transactions/hooks';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function TransactionsScreen() {
    const { period } = useActivePeriod();
    const activePeriodId = period?.id;

    const { transactions, isLoading, createTransaction } = useTransactions(activePeriodId);
    const { people } = usePeople();
    const createSplit = useCreateSplit();
    const format = useCurrencyStore((state) => state.format);

    const [modalVisible, setModalVisible] = useState(false);
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isGroup, setIsGroup] = useState(false);
    const [payerId, setPayerId] = useState<string | null>(null); // null = me
    const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);

    const handleCreateTransaction = async () => {
        const parsedAmount = parseFloat(amount);
        if (!category || isNaN(parsedAmount) || parsedAmount <= 0 || !activePeriodId) return;

        const txn = await createTransaction({
            periodId: activePeriodId,
            category,
            amount: parsedAmount,
            notes,
            isGroup,
            payerId,
            participantIds: isGroup ? [null, ...selectedPeopleIds] : [null],
        });

        if (isGroup) {
            await createSplit.mutateAsync({
                transactionId: txn.id,
                totalAmount: parsedAmount,
                payerId,
                participantIds: [null, ...selectedPeopleIds],
            });
        }

        setModalVisible(false);
        setCategory('');
        setAmount('');
        setNotes('');
        setIsGroup(false);
        setPayerId(null);
        setSelectedPeopleIds([]);
    };

    const togglePersonSelection = (id: string) => {
        if (selectedPeopleIds.includes(id)) {
            setSelectedPeopleIds(selectedPeopleIds.filter((pId) => pId !== id));
        } else {
            setSelectedPeopleIds([...selectedPeopleIds, id]);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>TRANSACTIONS</Text>
                <Pressable
                    style={[styles.addBtn, !activePeriodId && styles.disabledBtn]}
                    onPress={() => setModalVisible(true)}
                    disabled={!activePeriodId}
                >
                    <Ionicons name="add-circle-outline" size={16} color={tokens.colors.dark.onPrimary} style={{ marginRight: 4 }} />
                    <Text style={styles.addBtnText}>Add Expense</Text>
                </Pressable>
            </View>

            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                refreshing={isLoading}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={40} color={tokens.colors.dark.outline} />
                        <Text style={styles.emptyText}>No transactions recorded in this period.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.txnCard}>
                        <View style={styles.txnLeft}>
                            <View style={styles.categoryRow}>
                                <Ionicons
                                    name={item.is_group ? 'people' : 'cart'}
                                    size={18}
                                    color={item.is_group ? tokens.colors.signal.accent : tokens.colors.dark.primary}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.txnCategory}>{item.category}</Text>
                            </View>
                            {item.notes ? <Text style={styles.txnNotes}>{item.notes}</Text> : null}
                            <Text style={styles.txnDate}>
                                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                {item.is_group ? ' • Group Split' : ' • Solo Expense'}
                            </Text>
                        </View>
                        <Text style={styles.txnAmount}>{format(Number(item.amount))}</Text>
                    </View>
                )}
            />

            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalTitleRow}>
                            <Ionicons name="create" size={22} color={tokens.colors.dark.primary} />
                            <Text style={styles.modalHeaderTitle}>Add New Expense</Text>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Category (e.g. Groceries, Dinner)"
                            placeholderTextColor={tokens.colors.dark.outline}
                            value={category}
                            onChangeText={setCategory}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Amount ($)"
                            placeholderTextColor={tokens.colors.dark.outline}
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Notes (optional)"
                            placeholderTextColor={tokens.colors.dark.outline}
                            value={notes}
                            onChangeText={setNotes}
                        />

                        {/* Group Expense Toggle */}
                        <View style={styles.toggleRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="people-circle-outline" size={20} color={tokens.colors.dark.onSurface} style={{ marginRight: 6 }} />
                                <Text style={styles.toggleLabel}>Split as Group Expense?</Text>
                            </View>
                            <Pressable
                                style={[styles.toggleSwitch, isGroup && styles.toggleSwitchActive]}
                                onPress={() => setIsGroup(!isGroup)}
                            >
                                <Text style={styles.toggleSwitchText}>{isGroup ? 'YES' : 'NO'}</Text>
                            </Pressable>
                        </View>

                        {/* Group Options */}
                        {isGroup && (
                            <View style={styles.groupSection}>
                                <Text style={styles.subLabel}>Who Paid?</Text>
                                <View style={styles.chipRow}>
                                    <Pressable
                                        style={[styles.chip, payerId === null && styles.chipActive]}
                                        onPress={() => setPayerId(null)}
                                    >
                                        <Text style={[styles.chipText, payerId === null && styles.chipTextActive]}>
                                            Me
                                        </Text>
                                    </Pressable>
                                    {people.map((p) => (
                                        <Pressable
                                            key={p.id}
                                            style={[styles.chip, payerId === p.id && styles.chipActive]}
                                            onPress={() => setPayerId(p.id)}
                                        >
                                            <Text style={[styles.chipText, payerId === p.id && styles.chipTextActive]}>
                                                {p.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Text style={[styles.subLabel, { marginTop: 12 }]}>Include Participants:</Text>
                                <View style={styles.chipRow}>
                                    {people.map((p) => {
                                        const isSelected = selectedPeopleIds.includes(p.id);
                                        return (
                                            <Pressable
                                                key={p.id}
                                                style={[styles.chip, isSelected && styles.chipActive]}
                                                onPress={() => togglePersonSelection(p.id)}
                                            >
                                                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                                    {p.name}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleCreateTransaction}>
                                <Text style={styles.saveBtnText}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.dark.background,
        padding: tokens.spacing.containerPadding,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    addBtn: {
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
    addBtnText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onPrimary,
    },
    listContent: {
        gap: tokens.spacing.cardGap,
        paddingBottom: 100,
    },
    txnCard: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        padding: 16,
        borderRadius: tokens.radius.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    txnLeft: {
        gap: 4,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    txnCategory: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.onSurface,
    },
    txnNotes: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    txnDate: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.outline,
    },
    txnAmount: {
        ...tokens.typography.headlineMd,
        fontVariant: ['tabular-nums'],
        color: tokens.colors.dark.onSurface,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        gap: 12,
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
    modalHeaderTitle: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.onSurface,
    },
    input: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        color: tokens.colors.dark.onSurface,
        padding: 12,
        borderRadius: tokens.radius.md,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 8,
    },
    toggleLabel: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurface,
    },
    toggleSwitch: {
        backgroundColor: tokens.colors.dark.surfaceContainerHigh,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: tokens.radius.default,
    },
    toggleSwitchActive: {
        backgroundColor: tokens.colors.signal.accent,
    },
    toggleSwitchText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurface,
    },
    groupSection: {
        marginTop: 8,
    },
    subLabel: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
        marginBottom: 6,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    chipActive: {
        backgroundColor: tokens.colors.dark.primary,
        borderColor: tokens.colors.dark.primary,
    },
    chipText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurface,
    },
    chipTextActive: {
        color: tokens.colors.dark.onPrimary,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    cancelBtnText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    saveBtn: {
        backgroundColor: tokens.colors.dark.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: tokens.radius.default,
    },
    saveBtnText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onPrimary,
        fontWeight: '600',
    },
});
