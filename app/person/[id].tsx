import { Ionicons } from '@expo/vector-icons';
import { Debt } from '@features/debts/api';
import { DebtCard } from '@features/debts/components/DebtCard';
import { SettleModal } from '@features/debts/components/SettleModal';
import { useDebts } from '@features/debts/hooks';
import { usePeople } from '@features/people/hooks';
import { useActivePeriod } from '@features/periods/hooks';
import { calculatePersonNetBalance } from '@shared/lib/calculations';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export default function PersonDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { people } = usePeople();
    const { debts, settleDebt } = useDebts();
    const { period } = useActivePeriod();
    const format = useCurrencyStore((state) => state.format);

    const person = people.find((p) => p.id === id);
    const personDebts = debts.filter((d) => d.person_id === id);
    const net = calculatePersonNetBalance(personDebts);

    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{person?.name.charAt(0).toUpperCase() || 'P'}</Text>
                </View>
                <Text style={styles.name}>{person?.name || 'Contact'}</Text>
                {net.direction === 'even' ? (
                    <Text style={styles.subtext}>No outstanding debts</Text>
                ) : net.direction === 'owed_to_me' ? (
                    <Text style={[styles.subtext, { color: tokens.colors.signal.success, fontWeight: '600' }]}>
                        Owes you net {format(net.netAmount)}
                    </Text>
                ) : (
                    <Text style={[styles.subtext, { color: tokens.colors.signal.danger, fontWeight: '600' }]}>
                        You owe net {format(net.netAmount)}
                    </Text>
                )}
            </View>

            <View style={styles.sectionHeader}>
                <Ionicons name="receipt-outline" size={18} color={tokens.colors.dark.onSurfaceVariant} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>DEBT HISTORY ({personDebts.length})</Text>
            </View>

            <FlatList
                data={personDebts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyCard}>
                        <Ionicons name="checkmark-done-circle-outline" size={36} color={tokens.colors.dark.primary} />
                        <Text style={styles.emptyText}>No debts recorded for this contact.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <DebtCard
                        personName={person?.name || 'Contact'}
                        amount={Number(item.amount)}
                        direction={item.direction}
                        status={item.status}
                        onPress={() => {
                            if (item.status !== 'settled') {
                                setSelectedDebt(item);
                            }
                        }}
                    />
                )}
            />

            {selectedDebt && (
                <SettleModal
                    visible={Boolean(selectedDebt)}
                    personName={person?.name || 'Contact'}
                    amount={Number(selectedDebt.amount)}
                    onClose={() => setSelectedDebt(null)}
                    onConfirm={async (mode: 'from_balance' | 'separately') => {
                        if (period?.id && selectedDebt) {
                            await settleDebt({
                                debtId: selectedDebt.id,
                                amount: Number(selectedDebt.amount),
                                mode,
                                periodId: period.id,
                            });
                        }
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.dark.background,
        padding: tokens.spacing.containerPadding,
    },
    headerCard: {
        backgroundColor: tokens.colors.dark.surfaceContainer,
        borderRadius: tokens.radius.hero,
        padding: tokens.spacing.containerPadding,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: tokens.colors.dark.surfaceContainerHigh,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        ...tokens.typography.headlineLg,
        color: tokens.colors.dark.primary,
        fontSize: 28,
    },
    name: {
        ...tokens.typography.headlineLg,
        color: tokens.colors.dark.onSurface,
        fontSize: 22,
    },
    subtext: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurfaceVariant,
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
    listContent: {
        gap: tokens.spacing.cardGap,
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
});
