import Feather from "@expo/vector-icons/Feather";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import type { PersonDebtSummary } from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { Button } from "@shared/ui/Button";
import { Text } from "@shared/ui/Text";

interface PeopleManagerModalProps {
  visible: boolean;
  onClose: () => void;
  people: PersonDebtSummary[];
  currency: string;
  onRenamePerson: (oldName: string, newName: string) => Promise<void>;
  onDeletePerson: (personName: string) => Promise<{ success: boolean; error?: string }>;
}

export function PeopleManagerModal({
  visible,
  onClose,
  people,
  currency,
  onRenamePerson,
  onDeletePerson,
}: PeopleManagerModalProps) {
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [newNameInput, setNewNameInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const startRename = (person: PersonDebtSummary) => {
    setEditingPerson(person.person_name);
    setNewNameInput(person.person_name);
  };

  const handleSaveRename = async () => {
    if (!editingPerson || !newNameInput.trim()) return;
    setIsBusy(true);
    try {
      await onRenamePerson(editingPerson, newNameInput.trim());
      setEditingPerson(null);
      setNewNameInput("");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (person: PersonDebtSummary) => {
    if (person.open_count > 0 || person.net_balance !== 0) {
      Alert.alert(
        "Cannot Delete Person",
        `${person.person_name} has active debts or unsettled tabs (${formatCurrency(
          person.net_balance,
          currency
        )}). Settle all obligations before removing this contact.`
      );
      return;
    }

    Alert.alert(
      "Remove Person",
      `Are you sure you want to remove ${person.person_name} from your contact directory?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setIsBusy(true);
            try {
              const res = await onDeletePerson(person.person_name);
              if (!res.success && res.error) {
                Alert.alert("Error", res.error);
              }
            } finally {
              setIsBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/60 justify-center p-5">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface rounded-3xl p-6 border border-surface-border shadow-2xl max-h-[85%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3.5 border-b border-surface-border">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center">
                <Feather name="users" size={15} color="#22C55E" />
              </View>
              <Text className="text-base font-black text-ink tracking-tight">
                Manage People ({people.length})
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close manage people modal"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={15} color="#A1A1AA" />
            </Pressable>
          </View>

          {/* People List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 12, gap: 10 }}
          >
            {people.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-xs text-ink-muted">
                  No people in directory yet.
                </Text>
              </View>
            ) : (
              people.map((person) => {
                const isEditingThis = editingPerson === person.person_name;
                const hasOpenDebt = person.open_count > 0 || person.net_balance !== 0;

                return (
                  <View
                    key={person.person_name}
                    className="p-3.5 rounded-2xl bg-surface-muted border border-surface-border"
                  >
                    {isEditingThis ? (
                      <View className="gap-2">
                        <Text className="text-[10px] font-bold text-ink-whisper uppercase tracking-wider">
                          Rename {person.person_name}
                        </Text>
                        <TextInput
                          value={newNameInput}
                          onChangeText={setNewNameInput}
                          autoFocus
                          className="px-3 py-2.5 rounded-xl bg-surface border border-surface-border text-sm font-semibold text-ink"
                        />
                        <View className="flex-row gap-2 justify-end mt-1">
                          <Pressable
                            onPress={() => setEditingPerson(null)}
                            className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border"
                          >
                            <Text className="text-xs font-semibold text-ink-muted">
                              Cancel
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={handleSaveRename}
                            disabled={isBusy}
                            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100"
                          >
                            <Text className="text-xs font-bold text-white dark:text-zinc-950">
                              Save
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                          <View className="w-9 h-9 rounded-2xl bg-surface border border-surface-border items-center justify-center">
                            <Text className="text-xs font-black text-ink">
                              {person.person_name.slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              numberOfLines={1}
                              className="text-xs font-bold text-ink"
                            >
                              {person.person_name}
                            </Text>
                            <Text className="text-[10px] text-ink-muted mt-0.5">
                              {hasOpenDebt
                                ? person.net_balance > 0
                                  ? `Owes you ${formatCurrency(person.net_balance, currency)}`
                                  : `You owe ${formatCurrency(Math.abs(person.net_balance), currency)}`
                                : "All obligations settled"}
                            </Text>
                          </View>
                        </View>

                        {/* Actions: Edit & Delete */}
                        <View className="flex-row items-center gap-1.5">
                          <Pressable
                            onPress={() => startRename(person)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            className="w-8 h-8 rounded-full bg-surface items-center justify-center border border-surface-border active:scale-95"
                          >
                            <Feather name="edit-2" size={13} color="#A1A1AA" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDelete(person)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            className={`w-8 h-8 rounded-full items-center justify-center border active:scale-95 ${
                              hasOpenDebt
                                ? "bg-surface-muted border-transparent opacity-40"
                                : "bg-surface border-rose-500/30"
                            }`}
                          >
                            <Feather
                              name="trash-2"
                              size={13}
                              color={hasOpenDebt ? "#A1A1AA" : "#EF4444"}
                            />
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Close button */}
          <View className="pt-2">
            <Button label="Done" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
