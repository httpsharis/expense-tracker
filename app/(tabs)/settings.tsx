import { Ionicons } from '@expo/vector-icons';
import { useActivePeriod, usePeriods } from '@features/periods/hooks';
import { CURRENCIES } from '@shared/lib/currencies';
import { supabase } from '@shared/lib/supabase';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import { Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SettingsScreen() {
    const router = useRouter();
    const { period, createPeriod, closePeriod } = useActivePeriod();
    const { data: periods } = usePeriods();

    const currency = useCurrencyStore((state) => state.currency);
    const setCurrency = useCurrencyStore((state) => state.setCurrency);

    const [modalVisible, setModalVisible] = useState(false);
    const [periodName, setPeriodName] = useState('');

    const handleCreatePeriod = async () => {
        if (!periodName.trim()) return;
        await createPeriod(periodName.trim());
        setPeriodName('');
        setModalVisible(false);
    };

    const handleCloseActivePeriod = async () => {
        if (period) {
            await closePeriod(period.id);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/(auth)/login' as Href);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Currency Preference Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="cash-outline" size={18} color={tokens.colors.dark.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>CURRENCY PREFERENCE</Text>
                </View>
                <View style={styles.currencyGrid}>
                    {CURRENCIES.map((c) => {
                        const isSelected = currency.code === c.code;
                        return (
                            <Pressable
                                key={c.code}
                                style={[styles.currencyChip, isSelected && styles.currencyChipSelected]}
                                onPress={() => setCurrency(c.code)}
                            >
                                <Text style={[styles.currencySymbol, isSelected && styles.currencyTextSelected]}>
                                    {c.symbol.trim()}
                                </Text>
                                <Text style={[styles.currencyCode, isSelected && styles.currencyTextSelected]}>
                                    {c.code}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Current Period Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="calendar-outline" size={18} color={tokens.colors.dark.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>CURRENT PERIOD</Text>
                </View>
                {period ? (
                    <View style={styles.card}>
                        <View style={styles.periodRow}>
                            <View>
                                <Text style={styles.cardTitle}>{period.name}</Text>
                                <Text style={styles.cardSubtext}>
                                    Started: {new Date(period.started_at).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={styles.openBadge}>
                                <Text style={styles.openBadgeText}>OPEN</Text>
                            </View>
                        </View>
                        <Pressable style={styles.closeBtn} onPress={handleCloseActivePeriod}>
                            <Ionicons name="close-circle-outline" size={16} color={tokens.colors.dark.error} style={{ marginRight: 4 }} />
                            <Text style={styles.closeBtnText}>Close Active Period</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>No Active Period</Text>
                        <Text style={styles.cardSubtext}>Start a new monthly bucket to track balance & expenses.</Text>
                        <Pressable style={styles.createBtn} onPress={() => setModalVisible(true)}>
                            <Ionicons name="add-circle-outline" size={16} color={tokens.colors.dark.onPrimary} style={{ marginRight: 4 }} />
                            <Text style={styles.createBtnText}>Create New Period</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Period History */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={18} color={tokens.colors.dark.onSurfaceVariant} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>PERIOD HISTORY</Text>
                </View>
                {(!periods || periods.length === 0) ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No historical periods found.</Text>
                    </View>
                ) : (
                    periods.map((item) => (
                        <View key={item.id} style={styles.historyCard}>
                            <Text style={styles.historyName}>{item.name}</Text>
                            <Text style={[styles.historyStatus, item.status === 'open' ? { color: tokens.colors.signal.success } : null]}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            {/* Sign Out Button */}
            <View style={styles.bottomSection}>
                <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={18} color={tokens.colors.dark.error} style={{ marginRight: 6 }} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </Pressable>
            </View>

            {/* Create Period Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalTitleRow}>
                            <Ionicons name="calendar" size={22} color={tokens.colors.dark.primary} />
                            <Text style={styles.modalTitle}>Create New Period</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Period Name (e.g. August 2026)"
                            placeholderTextColor={tokens.colors.dark.outline}
                            value={periodName}
                            onChangeText={setPeriodName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleCreatePeriod}>
                                <Text style={styles.saveBtnText}>Create</Text>
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
    section: {
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    currencyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    currencyChip: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: tokens.radius.default,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    currencyChipSelected: {
        backgroundColor: tokens.colors.dark.primary,
        borderColor: tokens.colors.dark.primary,
    },
    currencySymbol: {
        ...tokens.typography.labelSm,
        fontWeight: 'bold',
        color: tokens.colors.dark.onSurface,
    },
    currencyCode: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    currencyTextSelected: {
        color: tokens.colors.dark.onPrimary,
    },
    card: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        padding: 16,
        borderRadius: tokens.radius.md,
        gap: 12,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    periodRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.onSurface,
    },
    cardSubtext: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
        marginTop: 4,
    },
    openBadge: {
        backgroundColor: tokens.colors.dark.surfaceContainerHigh,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: tokens.radius.sm,
    },
    openBadgeText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.signal.accent,
    },
    closeBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.colors.dark.surfaceContainerHigh,
        paddingVertical: 10,
        borderRadius: tokens.radius.default,
    },
    closeBtnText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.error,
    },
    createBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.colors.dark.primary,
        paddingVertical: 10,
        borderRadius: tokens.radius.default,
    },
    createBtnText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onPrimary,
    },
    emptyCard: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        padding: 16,
        borderRadius: tokens.radius.md,
        alignItems: 'center',
    },
    emptyText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.outline,
    },
    historyCard: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        padding: 14,
        borderRadius: tokens.radius.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    historyName: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurface,
    },
    historyStatus: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.outline,
    },
    bottomSection: {
        marginTop: 12,
        paddingBottom: 24,
    },
    signOutBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        paddingVertical: 12,
        borderRadius: tokens.radius.default,
        borderWidth: 1,
        borderColor: tokens.colors.dark.error,
    },
    signOutText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.error,
        fontWeight: '600',
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
        padding: 12,
        borderRadius: tokens.radius.md,
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
