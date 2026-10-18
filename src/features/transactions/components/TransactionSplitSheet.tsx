import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { GroupWithMembers, PersonDebtSummary } from "@services/splits";

export interface TransactionSplitSheetProps {
  visible: boolean;
  groups: GroupWithMembers[];
  peopleSummaries: PersonDebtSummary[];
  selectedSplitGroup: GroupWithMembers | null;
  selectedSplitPerson: string | null;
  splitPaidBy: string;
  onChangePaidBy: (paidBy: string) => void;
  onSelectGroup: (group: GroupWithMembers | null) => void;
  onSelectPerson: (personName: string | null) => void;
  onClose: () => void;
}

export function TransactionSplitSheet({
  visible,
  groups,
  peopleSummaries,
  selectedSplitGroup,
  selectedSplitPerson,
  splitPaidBy,
  onChangePaidBy,
  onSelectGroup,
  onSelectPerson,
  onClose,
}: TransactionSplitSheetProps) {
  const [splitMode, setSplitMode] = useState<"person" | "group">(
    selectedSplitGroup ? "group" : "person",
  );
  const [friendNameInput, setFriendNameInput] = useState(selectedSplitPerson || "");

  const handleApplyFriendName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSelectPerson(trimmed);
    onSelectGroup(null);
    if (splitPaidBy !== "You") {
      onChangePaidBy(trimmed);
    }
  };

  const handleClearSplit = () => {
    onSelectGroup(null);
    onSelectPerson(null);
    onChangePaidBy("You");
    setFriendNameInput("");
    onClose();
  };

  const isSplitActive = Boolean(selectedSplitGroup || selectedSplitPerson);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/50 justify-end">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white dark:bg-forest-surface rounded-t-[32px] p-6 pb-10 max-h-[85%] border-t border-botanical-border dark:border-forest-border"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-botanical-divider dark:border-forest-border">
            <View>
              <Text className="text-base font-extrabold text-ink dark:text-ink-light tracking-tight">
                Split Expense
              </Text>
              <Text className="text-xs text-ink-muted dark:text-ink-muted-dark mt-0.5">
                Divide this bill equally with a friend or group
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-botanical-pearl dark:bg-forest border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {/* 1. Who is splitting? Toggle: Friend vs Group */}
            <View className="flex-row p-1 rounded-2xl bg-botanical-pearl dark:bg-forest-deep mb-4 border border-botanical-border dark:border-forest-border">
              <Pressable
                onPress={() => setSplitMode("person")}
                className={`flex-1 py-2 rounded-xl items-center justify-center flex-row gap-1.5 transition-all ${
                  splitMode === "person"
                    ? "bg-white dark:bg-forest-surface shadow-2xs"
                    : ""
                }`}
              >
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={splitMode === "person" ? "#16A34A" : "#64748B"}
                />
                <Text
                  className={`text-xs font-bold ${
                    splitMode === "person"
                      ? "text-ink dark:text-ink-light"
                      : "text-ink-muted dark:text-ink-muted-dark"
                  }`}
                >
                  With a Friend
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSplitMode("group")}
                className={`flex-1 py-2 rounded-xl items-center justify-center flex-row gap-1.5 transition-all ${
                  splitMode === "group"
                    ? "bg-white dark:bg-forest-surface shadow-2xs"
                    : ""
                }`}
              >
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={splitMode === "group" ? "#16A34A" : "#64748B"}
                />
                <Text
                  className={`text-xs font-bold ${
                    splitMode === "group"
                      ? "text-ink dark:text-ink-light"
                      : "text-ink-muted dark:text-ink-muted-dark"
                  }`}
                >
                  With a Group
                </Text>
              </Pressable>
            </View>

            {/* 2. Friend Section */}
            {splitMode === "person" ? (
              <View className="mb-4">
                <Text className="text-[11px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark mb-2">
                  Friend&apos;s Name
                </Text>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="flex-1 flex-row items-center bg-botanical-pearl dark:bg-forest-deep border border-botanical-border dark:border-forest-border rounded-2xl px-3.5 py-2.5">
                    <Ionicons name="person-circle-outline" size={18} color="#64748B" className="mr-2" />
                    <TextInput
                      value={friendNameInput}
                      onChangeText={(txt) => {
                        setFriendNameInput(txt);
                        if (txt.trim()) {
                          handleApplyFriendName(txt);
                        }
                      }}
                      placeholder="e.g. Alex, Hamza, Sara"
                      placeholderTextColor="#94A3B8"
                      className="flex-1 text-xs font-bold text-ink dark:text-ink-light py-0"
                      returnKeyType="done"
                      onSubmitEditing={() => handleApplyFriendName(friendNameInput)}
                    />
                    {friendNameInput.length > 0 && (
                      <Pressable onPress={() => { setFriendNameInput(""); onSelectPerson(null); }} hitSlop={6}>
                        <Feather name="x" size={13} color="#94A3B8" />
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Quick suggestions from past contacts */}
                {peopleSummaries.length > 0 && (
                  <View className="mt-1">
                    <Text className="text-[10px] font-bold text-ink-whisper dark:text-ink-whisper-dark uppercase tracking-wider mb-1.5">
                      Recent Friends
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {peopleSummaries.map((p) => {
                        const isSelected = selectedSplitPerson === p.person_name;
                        return (
                          <Pressable
                            key={p.person_name}
                            onPress={() => {
                              setFriendNameInput(p.person_name);
                              handleApplyFriendName(p.person_name);
                            }}
                            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border active:scale-95 shadow-2xs ${
                              isSelected
                                ? "bg-forest dark:bg-lime border-forest dark:border-lime"
                                : "bg-botanical-pearl dark:bg-forest-deep border-botanical-border dark:border-forest-border"
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                isSelected
                                  ? "text-white dark:text-forest"
                                  : "text-ink dark:text-ink-light"
                              }`}
                            >
                              {p.person_name}
                            </Text>
                            {isSelected && <Feather name="check" size={12} color="#22C55E" />}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              /* Group Section */
              <View className="mb-4">
                <Text className="text-[11px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark mb-2">
                  Select Group
                </Text>
                {groups.length === 0 ? (
                  <View className="p-4 rounded-2xl bg-botanical-pearl dark:bg-forest-deep border border-botanical-border dark:border-forest-border items-center">
                    <Ionicons name="people-outline" size={24} color="#94A3B8" className="mb-1" />
                    <Text className="text-xs text-ink-muted dark:text-ink-muted-dark text-center font-medium">
                      No groups created yet. You can create groups anytime in the Splits tab.
                    </Text>
                  </View>
                ) : (
                  <View className="gap-2">
                    {groups.map((group) => {
                      const isSelected = selectedSplitGroup?.id === group.id;
                      return (
                        <Pressable
                          key={group.id}
                          onPress={() => {
                            onSelectGroup(group);
                            onSelectPerson(null);
                          }}
                          className={`p-3.5 rounded-2xl border flex-row items-center justify-between active:scale-98 shadow-2xs ${
                            isSelected
                              ? "border-forest bg-forest/5 dark:border-lime dark:bg-lime/10"
                              : "border-botanical-border bg-botanical-pearl dark:border-forest-border dark:bg-forest-deep"
                          }`}
                        >
                          <View className="flex-1 mr-2">
                            <Text className="text-xs font-extrabold text-ink dark:text-ink-light">
                              {group.name}
                            </Text>
                            <Text className="text-[11px] text-ink-muted dark:text-ink-muted-dark mt-0.5" numberOfLines={1}>
                              {group.members?.length || 0} members: {group.members?.map((m) => m.name).join(", ")}
                            </Text>
                          </View>
                          {isSelected && <Feather name="check" size={16} color="#16A34A" />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* 3. Who Paid for the Bill? */}
            <Text className="text-[11px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark mb-2">
              Who Paid the Bill?
            </Text>
            <View className="flex-row gap-2.5 mb-5">
              <Pressable
                onPress={() => onChangePaidBy("You")}
                className={`flex-1 p-3.5 rounded-2xl border active:scale-98 shadow-2xs ${
                  splitPaidBy === "You"
                    ? "border-lime bg-lime/10 dark:border-lime dark:bg-lime/15"
                    : "border-botanical-border bg-botanical-pearl dark:border-forest-border dark:bg-forest-deep"
                }`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs font-extrabold text-ink dark:text-ink-light">
                    You Paid
                  </Text>
                  {splitPaidBy === "You" && <Feather name="check-circle" size={14} color="#16A34A" />}
                </View>
                <Text className="text-[11px] text-emerald-600 dark:text-lime font-semibold">
                  Others owe you 50%
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onChangePaidBy(selectedSplitPerson || "Friend")}
                className={`flex-1 p-3.5 rounded-2xl border active:scale-98 shadow-2xs ${
                  splitPaidBy !== "You"
                    ? "border-blue-600 bg-blue-500/10 dark:border-blue-500"
                    : "border-botanical-border bg-botanical-pearl dark:border-forest-border dark:bg-forest-deep"
                }`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs font-extrabold text-ink dark:text-ink-light">
                    {selectedSplitPerson || "Friend"} Paid
                  </Text>
                  {splitPaidBy !== "You" && <Feather name="check-circle" size={14} color="#2563EB" />}
                </View>
                <Text className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  You owe them 50%
                </Text>
              </Pressable>
            </View>

            {/* 4. Active Status Pill */}
            {isSplitActive ? (
              <View className="flex-row items-center justify-between p-3 rounded-2xl bg-lime/10 border border-lime/25 mb-4">
                <View className="flex-row items-center gap-2">
                  <Feather name="users" size={14} color="#16A34A" />
                  <Text className="text-xs font-bold text-emerald-700 dark:text-lime">
                    Splitting with {selectedSplitPerson || selectedSplitGroup?.name}
                  </Text>
                </View>
                <Pressable onPress={handleClearSplit} hitSlop={8}>
                  <Text className="text-xs font-bold text-coral">
                    Remove
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* 5. Footer CTA */}
            <View className="gap-2">
              <Pressable
                onPress={onClose}
                className="w-full h-13 rounded-2xl bg-forest dark:bg-lime items-center justify-center active:scale-98 shadow-sm"
              >
                <Text className="text-xs font-black text-white dark:text-forest">
                  {isSplitActive ? "Confirm Split" : "Done"}
                </Text>
              </Pressable>

              {isSplitActive && (
                <Pressable
                  onPress={handleClearSplit}
                  className="w-full h-11 rounded-2xl bg-transparent items-center justify-center active:scale-98"
                >
                  <Text className="text-xs font-bold text-ink-muted dark:text-ink-muted-dark">
                    Don&apos;t Split (Personal Expense)
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
