import { Ionicons } from '@expo/vector-icons';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface SettleModalProps {
    visible: boolean;
    personName: string;
    amount: number;
    onClose: () => void;
    onConfirm: (mode: 'from_balance' | 'separately') => Promise<void>;
}

export const SettleModal: React.FC<SettleModalProps> = ({
    visible,
    personName,
    amount,
    onClose,
    onConfirm,
}) => {
    const format = useCurrencyStore((state) => state.format);
    const [mode, setMode] = useState<'from_balance' | 'separately'>('from_balance');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSettle = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(mode);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Settle {format(amount)} with {personName}</Text>

                    <Pressable
                        style={[styles.option, mode === 'from_balance' && styles.optionSelected]}
                        onPress={() => setMode('from_balance')}
                    >
                        <View style={styles.optionHeader}>
                            <Ionicons
                                name="wallet-outline"
                                size={20}
                                color={mode === 'from_balance' ? tokens.colors.dark.primary : tokens.colors.dark.onSurfaceVariant}
                            />
                            <Text style={styles.optionTitle}>Pull from monthly balance</Text>
                        </View>
                        <Text style={styles.optionSubtext}>Reduces what you have left to spend this month.</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.option, mode === 'separately' && styles.optionSelected]}
                        onPress={() => setMode('separately')}
                    >
                        <View style={styles.optionHeader}>
                            <Ionicons
                                name="cash-outline"
                                size={20}
                                color={mode === 'separately' ? tokens.colors.dark.primary : tokens.colors.dark.onSurfaceVariant}
                            />
                            <Text style={styles.optionTitle}>Settle separately</Text>
                        </View>
                        <Text style={styles.optionSubtext}>Clears the debt without touching your tracked pocket money.</Text>
                    </Pressable>

                    <View style={styles.actions}>
                        <Pressable style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable style={styles.confirmButton} onPress={handleSettle} disabled={isSubmitting}>
                            <Text style={styles.confirmText}>{isSubmitting ? 'Settling...' : 'Confirm'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        padding: tokens.spacing.containerPadding,
    },
    container: {
        backgroundColor: tokens.colors.dark.surfaceContainer,
        borderRadius: tokens.radius.hero,
        padding: tokens.spacing.containerPadding,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    title: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.onSurface,
        marginBottom: 20,
    },
    option: {
        padding: 16,
        borderRadius: tokens.radius.md,
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    optionSelected: {
        borderColor: tokens.colors.dark.primary,
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionTitle: {
        ...tokens.typography.bodyMd,
        fontWeight: '600',
        color: tokens.colors.dark.onSurface,
    },
    optionSubtext: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
        marginTop: 6,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 16,
        gap: 12,
    },
    cancelButton: {
        minHeight: tokens.spacing.touchTarget,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    cancelText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onSurfaceVariant,
    },
    confirmButton: {
        minHeight: tokens.spacing.touchTarget,
        justifyContent: 'center',
        backgroundColor: tokens.colors.dark.primary,
        borderRadius: tokens.radius.default,
        paddingHorizontal: 20,
    },
    confirmText: {
        ...tokens.typography.bodyMd,
        color: tokens.colors.dark.onPrimary,
        fontWeight: '600',
    },
});