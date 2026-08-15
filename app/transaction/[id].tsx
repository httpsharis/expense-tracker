import { Ionicons } from '@expo/vector-icons';
import { useSplit } from '@features/splits/hooks';
import { useTransaction } from '@features/transactions/hooks';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function TransactionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: txn, isLoading: isTxnLoading } = useTransaction(id || '');
    const { data: split } = useSplit(id || '');
    const format = useCurrencyStore((state) => state.format);

    if (isTxnLoading || !txn) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading transaction details...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Ionicons
                        name={txn.is_group ? 'people' : 'cart'}
                        size={28}
                        color={tokens.colors.dark.primary}
                    />
                    <Text style={styles.category}>{txn.category}</Text>
                </View>

                <Text style={styles.amount}>{format(Number(txn.amount))}</Text>
                {txn.notes ? <Text style={styles.notes}>{txn.notes}</Text> : null}

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={16} color={tokens.colors.dark.onSurfaceVariant} />
                    <Text style={styles.metaLabel}>Date:</Text>
                    <Text style={styles.metaValue}>{new Date(txn.date).toLocaleString()}</Text>
                </View>

                <View style={styles.metaRow}>
                    <Ionicons name="pricetag-outline" size={16} color={tokens.colors.dark.onSurfaceVariant} />
                    <Text style={styles.metaLabel}>Type:</Text>
                    <Text style={styles.metaValue}>{txn.is_group ? 'Group Expense' : 'Solo Expense'}</Text>
                </View>

                {split && (
                    <View style={styles.splitBox}>
                        <View style={styles.splitTitleRow}>
                            <Ionicons name="calculator-outline" size={18} color={tokens.colors.signal.accent} />
                            <Text style={styles.splitTitle}>SPLIT BREAKDOWN</Text>
                        </View>
                        <Text style={styles.splitText}>Total Amount: {format(Number(split.total_amount))}</Text>
                        <Text style={styles.splitText}>Participants Count: {split.num_people}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.dark.background,
        padding: tokens.spacing.containerPadding,
    },
    loadingText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.outline,
    },
    card: {
        backgroundColor: tokens.colors.dark.surfaceContainer,
        borderRadius: tokens.radius.hero,
        padding: tokens.spacing.containerPadding,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    category: {
        ...tokens.typography.headlineLg,
        color: tokens.colors.dark.onSurface,
        fontSize: 24,
    },
    amount: {
        ...tokens.typography.dataDisplay,
        color: tokens.colors.dark.onSurface,
        marginVertical: 12,
    },
    notes: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurfaceVariant,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: tokens.colors.dark.surfaceContainerHigh,
        marginVertical: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    metaLabel: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    metaValue: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurface,
    },
    splitBox: {
        marginTop: 20,
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        padding: 14,
        borderRadius: tokens.radius.md,
        gap: 4,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    splitTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    splitTitle: {
        ...tokens.typography.labelSm,
        color: tokens.colors.signal.accent,
    },
    splitText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurface,
    },
});
