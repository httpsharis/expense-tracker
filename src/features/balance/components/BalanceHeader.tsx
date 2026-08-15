import { Ionicons } from '@expo/vector-icons';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BalanceHeaderProps {
    balance: number;
    progress: number;
}

export const BalanceHeader: React.FC<BalanceHeaderProps> = ({ balance, progress }) => {
    const format = useCurrencyStore((state) => state.format);

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.label}>POCKET MONEY REMAINING</Text>
                <Ionicons name="card" size={20} color={tokens.colors.dark.primary} />
            </View>
            <Text style={styles.balanceText}>
                {format(balance)}
            </Text>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: tokens.colors.dark.surfaceContainer,
        borderRadius: tokens.radius.hero,
        padding: tokens.spacing.containerPadding,
        minHeight: 140,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    balanceText: {
        ...tokens.typography.dataDisplay,
        color: tokens.colors.dark.onSurface,
        marginBottom: 16,
    },
    progressTrack: {
        height: 6,
        backgroundColor: tokens.colors.dark.surfaceContainerHigh,
        borderRadius: tokens.radius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: tokens.colors.dark.primary,
        borderRadius: tokens.radius.full,
    },
});