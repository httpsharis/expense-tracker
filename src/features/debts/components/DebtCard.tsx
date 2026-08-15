import { Ionicons } from '@expo/vector-icons';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface DebtCardProps {
    personName: string;
    amount: number;
    direction: 'owed_to_me' | 'i_owe';
    status: 'open' | 'partial' | 'settled';
    onPress: () => void;
}

export const DebtCard: React.FC<DebtCardProps> = ({
    personName,
    amount,
    direction,
    status,
    onPress,
}) => {
    const format = useCurrencyStore((state) => state.format);
    const isOpen = status !== 'settled';
    const isOwedToMe = direction === 'owed_to_me';
    const labelText = isOwedToMe ? 'Owed to me' : 'I owe';

    const iconName = !isOpen
        ? 'checkmark-circle'
        : isOwedToMe
        ? 'arrow-down-circle'
        : 'arrow-up-circle';

    const iconColor = !isOpen
        ? tokens.colors.dark.outline
        : isOwedToMe
        ? tokens.colors.signal.success
        : tokens.colors.signal.danger;

    return (
        <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
            <View style={styles.left}>
                <View style={styles.titleRow}>
                    <Ionicons name={iconName} size={20} color={iconColor} style={styles.icon} />
                    <Text style={styles.personName}>{personName}</Text>
                </View>
                <Text style={styles.label}>{isOpen ? labelText : 'Settled'}</Text>
            </View>
            <Text style={[styles.amount, { color: !isOpen ? tokens.colors.dark.outline : isOwedToMe ? tokens.colors.signal.success : tokens.colors.signal.danger }]}>
                {format(amount)}
            </Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        padding: 16,
        borderRadius: tokens.radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: tokens.spacing.touchTarget,
        marginBottom: tokens.spacing.cardGap,
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    left: {
        flexDirection: 'column',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 8,
    },
    personName: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.onSurface,
    },
    label: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
        marginTop: 4,
    },
    amount: {
        ...tokens.typography.headlineMd,
        fontVariant: ['tabular-nums'],
    },
});