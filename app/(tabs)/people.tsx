import { Ionicons } from '@expo/vector-icons';
import { useDebts } from '@features/debts/hooks';
import { usePeople } from '@features/people/hooks';
import { calculatePersonNetBalance } from '@shared/lib/calculations';
import { useCurrencyStore } from '@shared/store/currencyStore';
import { tokens } from '@shared/theme/tokens';
import { Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function PeopleScreen() {
    const router = useRouter();
    const { people, isLoading, addPerson, deletePerson } = usePeople();
    const { debts } = useDebts();
    const format = useCurrencyStore((state) => state.format);

    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');

    const handleAddPerson = async () => {
        if (!name.trim()) return;
        await addPerson(name.trim());
        setName('');
        setModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>PEOPLE & CONTACTS</Text>
                <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <Ionicons name="person-add-outline" size={16} color={tokens.colors.dark.onPrimary} style={{ marginRight: 4 }} />
                    <Text style={styles.addBtnText}>Add Person</Text>
                </Pressable>
            </View>

            <FlatList
                data={people}
                keyExtractor={(item) => item.id}
                refreshing={isLoading}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={40} color={tokens.colors.dark.outline} />
                        <Text style={styles.emptyText}>No contacts added yet.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const personDebts = debts.filter((d) => d.person_id === item.id);
                    const net = calculatePersonNetBalance(personDebts);

                    return (
                        <Pressable style={styles.personCard} onPress={() => router.push(`/person/${item.id}` as Href)}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={styles.personInfo}>
                                <Text style={styles.personName}>{item.name}</Text>
                                {net.direction === 'even' ? (
                                    <Text style={styles.personSubtext}>No active debts</Text>
                                ) : net.direction === 'owed_to_me' ? (
                                    <Text style={[styles.personSubtext, { color: tokens.colors.signal.success }]}>
                                        Owes you {format(net.netAmount)}
                                    </Text>
                                ) : (
                                    <Text style={[styles.personSubtext, { color: tokens.colors.signal.danger }]}>
                                        You owe {format(net.netAmount)}
                                    </Text>
                                )}
                            </View>
                            <Pressable style={styles.deleteBtn} onPress={() => deletePerson(item.id)}>
                                <Ionicons name="trash-outline" size={18} color={tokens.colors.dark.error} />
                            </Pressable>
                        </Pressable>
                    );
                }}
            />

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalTitleRow}>
                            <Ionicons name="person-add" size={22} color={tokens.colors.dark.primary} />
                            <Text style={styles.modalHeaderTitle}>Add New Contact</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Name (e.g. Alex, Sam)"
                            placeholderTextColor={tokens.colors.dark.outline}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleAddPerson}>
                                <Text style={styles.saveBtnText}>Add</Text>
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
    addBtnText: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onPrimary,
    },
    listContent: {
        gap: tokens.spacing.cardGap,
        paddingBottom: 100,
    },
    personCard: {
        backgroundColor: tokens.colors.dark.surfaceContainerLow,
        padding: 16,
        borderRadius: tokens.radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: tokens.colors.dark.surfaceContainerHigh,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: tokens.colors.dark.surfaceContainerHigh,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.primary,
    },
    personInfo: {
        flex: 1,
    },
    personName: {
        ...tokens.typography.headlineMd,
        color: tokens.colors.dark.onSurface,
    },
    personSubtext: {
        ...tokens.typography.labelSm,
        color: tokens.colors.dark.onSurfaceVariant,
        marginTop: 2,
    },
    deleteBtn: {
        padding: 8,
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
