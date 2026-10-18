import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { AccountWithBalance } from "@services/accounts";
import { CategoryIcon } from "@shared/components/CategoryIcon";
import { formatCurrency } from "@shared/lib/currency";

export interface CategorySheetModalProps {
  visible: boolean;
  categories: { id: string; name: string; icon: string | null }[];
  activeCategoryId?: string | null;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}

export function CategorySheetModal({
  visible,
  categories,
  activeCategoryId,
  onSelect,
  onClose,
}: CategorySheetModalProps) {
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
          className="bg-white dark:bg-forest-surface rounded-t-[32px] p-6 pb-10 max-h-[75%] border-t border-botanical-border dark:border-forest-border"
        >
          <View className="flex-row items-center justify-between pb-4 border-b border-botanical-divider dark:border-forest-border">
            <Text className="text-base font-extrabold text-ink dark:text-ink-light tracking-tight">
              Select Category
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-botanical-pearl dark:bg-forest border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-2.5">
              {categories.map((cat) => {
                const isSelected =
                  (activeCategoryId ?? categories[0]?.id) === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      onSelect(cat.id);
                      onClose();
                    }}
                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl border active:scale-95 shadow-2xs ${
                      isSelected
                        ? "border-forest bg-forest dark:border-lime dark:bg-lime"
                        : "border-botanical-border bg-botanical-pearl dark:border-forest-border dark:bg-forest-deep"
                    }`}
                  >
                    <CategoryIcon
                      icon={cat.icon}
                      size={18}
                      color={isSelected ? "#22C55E" : "#6B6B6E"}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        isSelected
                          ? "text-white dark:text-forest"
                          : "text-ink dark:text-ink-light"
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export interface AccountSheetModalProps {
  visible: boolean;
  txType: "expense" | "income" | "transfer";
  accounts: AccountWithBalance[];
  selectedAccountId: string | null;
  sourceAccountId?: string;
  selectedTransferAccountId: string | null;
  selectionTarget?: "source" | "target";
  onSelectSource: (accountId: string) => void;
  onSelectTarget: (accountId: string) => void;
  onClose: () => void;
}

export function AccountSheetModal({
  visible,
  txType,
  accounts,
  selectedAccountId,
  sourceAccountId,
  selectedTransferAccountId,
  selectionTarget,
  onSelectSource,
  onSelectTarget,
  onClose,
}: AccountSheetModalProps) {
  const effectiveSourceId = selectedAccountId ?? sourceAccountId;
  const isTargetMode = selectionTarget === "target";

  const modalTitle = isTargetMode
    ? "Select Destination Account"
    : txType === "transfer" && selectionTarget === "source"
    ? "Select Source Account"
    : txType === "transfer"
    ? "Choose Accounts"
    : "Payment Account";

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
          className="bg-white dark:bg-forest-surface rounded-t-[32px] p-6 pb-10 max-h-[75%] border-t border-botanical-border dark:border-forest-border"
        >
          <View className="flex-row items-center justify-between pb-4 border-b border-botanical-divider dark:border-forest-border">
            <Text className="text-base font-extrabold text-ink dark:text-ink-light tracking-tight">
              {modalTitle}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-botanical-pearl dark:bg-forest border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {txType === "transfer" && !selectionTarget ? (
              <View className="gap-5">
                {/* From Account Section */}
                <View>
                  <Text className="text-[11px] font-black text-ink-whisper dark:text-ink-whisper-dark mb-2 uppercase tracking-wider">
                    From Account (Source)
                  </Text>
                  <View className="gap-2">
                    {accounts.map((acc) => {
                      const isSelected = effectiveSourceId === acc.id;
                      return (
                        <Pressable
                          key={`from-${acc.id}`}
                          onPress={() => onSelectSource(acc.id)}
                          className={`flex-row items-center justify-between p-3.5 rounded-2xl border active:scale-98 shadow-2xs ${
                            isSelected
                              ? "border-forest bg-forest/5 dark:border-lime dark:bg-lime/10"
                              : "border-botanical-border bg-botanical-pearl dark:border-forest-border dark:bg-forest-deep"
                          }`}
                        >
                          <View className="flex-row items-center gap-2.5">
                            <Ionicons name="wallet-outline" size={16} color={isSelected ? "#16A34A" : "#64748B"} />
                            <Text className="text-xs font-bold text-ink dark:text-ink-light">
                              {acc.name}
                            </Text>
                          </View>
                          <Text className="text-xs font-bold text-ink-muted dark:text-ink-muted-dark tabular-nums">
                            {formatCurrency(acc.balance, acc.currency)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* To Account Section */}
                <View>
                  <Text className="text-[11px] font-black text-ink-whisper dark:text-ink-whisper-dark mb-2 uppercase tracking-wider">
                    To Account (Destination)
                  </Text>
                  <View className="gap-2">
                    {accounts
                      .filter((a) => a.id !== effectiveSourceId)
                      .map((acc) => {
                        const isSelected = selectedTransferAccountId === acc.id;
                        return (
                          <Pressable
                            key={`to-${acc.id}`}
                            onPress={() => onSelectTarget(acc.id)}
                            className={`flex-row items-center justify-between p-3.5 rounded-2xl border active:scale-98 shadow-2xs ${
                              isSelected
                                ? "border-blue-600 bg-blue-500/10 dark:border-blue-400"
                                : "border-botanical-border bg-botanical-pearl dark:border-forest-border dark:bg-forest-deep"
                            }`}
                          >
                            <View className="flex-row items-center gap-2.5">
                              <Ionicons name="arrow-forward-circle-outline" size={16} color={isSelected ? "#2563EB" : "#64748B"} />
                              <Text className="text-xs font-bold text-ink dark:text-ink-light">
                                {acc.name}
                              </Text>
                            </View>
                            <Text className="text-xs font-bold text-ink-muted dark:text-ink-muted-dark tabular-nums">
                              {formatCurrency(acc.balance, acc.currency)}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                </View>

                <Pressable
                  onPress={onClose}
                  className="w-full h-12 rounded-2xl bg-forest dark:bg-lime items-center justify-center mt-1 active:scale-98"
                >
                  <Text className="text-xs font-black text-white dark:text-forest">Done</Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-2">
                {accounts.map((acc) => {
                  const isSelected = isTargetMode
                    ? selectedTransferAccountId === acc.id
                    : effectiveSourceId === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => {
                        if (isTargetMode) {
                          onSelectTarget(acc.id);
                        } else {
                          onSelectSource(acc.id);
                        }
                        onClose();
                      }}
                      className={`flex-row items-center justify-between p-3.5 rounded-2xl border active:scale-98 shadow-2xs ${
                        isSelected
                          ? "border-forest bg-forest/5 dark:border-lime dark:bg-lime/10"
                          : "border-botanical-border bg-botanical-pearl dark:border-forest-border dark:bg-forest-deep"
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-9 h-9 rounded-xl bg-white dark:bg-forest-surface items-center justify-center border border-botanical-border dark:border-forest-border">
                          <Ionicons
                            name="card-outline"
                            size={18}
                            color={isSelected ? "#16A34A" : "#64748B"}
                          />
                        </View>
                        <View>
                          <Text className="text-sm font-bold text-ink dark:text-ink-light">
                            {acc.name}
                          </Text>
                          <Text className="text-[11px] text-ink-muted dark:text-ink-muted-dark capitalize">
                            {acc.type} • {acc.currency}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm font-black text-ink dark:text-ink-light tabular-nums">
                        {formatCurrency(acc.balance, acc.currency)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export interface DateSheetModalProps {
  visible: boolean;
  dateSelection: "today" | "yesterday" | "custom";
  customDate: string;
  onSelectDateType: (type: "today" | "yesterday" | "custom") => void;
  onChangeCustomDate: (isoOrDate: string) => void;
  onClose: () => void;
}

export function DateSheetModal({
  visible,
  dateSelection,
  customDate,
  onSelectDateType,
  onChangeCustomDate,
  onClose,
}: DateSheetModalProps) {
  const customDateFormatted = customDate.slice(0, 10);

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
          className="bg-white dark:bg-forest-surface rounded-t-[32px] p-6 pb-10 border-t border-botanical-border dark:border-forest-border"
        >
          <View className="flex-row items-center justify-between pb-4 border-b border-botanical-divider dark:border-forest-border">
            <Text className="text-base font-extrabold text-ink dark:text-ink-light tracking-tight">
              Transaction Date
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-botanical-pearl dark:bg-forest border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={16} color="#64748B" />
            </Pressable>
          </View>

          <View className="gap-2.5 mt-4">
            {(
              [
                { id: "today", label: "Today", desc: "Current date & time" },
                { id: "yesterday", label: "Yesterday", desc: "1 day ago" },
                {
                  id: "custom",
                  label: "Custom Date",
                  desc: "Select or type YYYY-MM-DD",
                },
              ] as const
            ).map((opt) => {
              const isSelected = dateSelection === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    onSelectDateType(opt.id);
                    if (opt.id !== "custom") {
                      onClose();
                    }
                  }}
                  className={`flex-row items-center justify-between p-3.5 rounded-2xl border active:scale-98 shadow-2xs ${
                    isSelected
                      ? "border-forest bg-forest/5 dark:border-lime dark:bg-lime/10"
                      : "border-botanical-border bg-botanical-pearl dark:border-forest-border dark:bg-forest-deep"
                  }`}
                >
                  <View>
                    <Text className="text-xs font-bold text-ink dark:text-ink-light">
                      {opt.label}
                    </Text>
                    <Text className="text-[11px] text-ink-muted dark:text-ink-muted-dark">{opt.desc}</Text>
                  </View>
                  {isSelected && (
                    <Feather name="check" size={16} color="#16A34A" />
                  )}
                </Pressable>
              );
            })}

            {dateSelection === "custom" && (
              <View className="mt-2 gap-2">
                <Text className="text-[11px] font-bold text-ink-whisper dark:text-ink-whisper-dark uppercase tracking-wider">
                  Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={customDateFormatted}
                  onChangeText={(txt) => onChangeCustomDate(txt)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  className="px-4 py-3 rounded-2xl bg-botanical-pearl dark:bg-forest-deep border border-botanical-border dark:border-forest-border text-sm font-bold text-ink dark:text-ink-light"
                />
                <Pressable
                  onPress={onClose}
                  className="w-full h-12 rounded-2xl bg-forest dark:bg-lime items-center justify-center mt-1 active:scale-98"
                >
                  <Text className="text-xs font-black text-white dark:text-forest">Done</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export interface TagsSheetModalProps {
  visible: boolean;
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onAddCustomTag?: (tag: string) => void;
  onClose: () => void;
}

export function TagsSheetModal({
  visible,
  availableTags,
  selectedTags,
  onToggleTag,
  onAddCustomTag,
  onClose,
}: TagsSheetModalProps) {
  const [newTagInput, setNewTagInput] = React.useState("");

  const handleAdd = () => {
    const clean = newTagInput.trim().replace(/^#+/, "").trim();
    if (!clean) return;
    if (onAddCustomTag) {
      onAddCustomTag(clean);
    }
    if (!selectedTags.includes(clean)) {
      onToggleTag(clean);
    }
    setNewTagInput("");
  };

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
          className="bg-white dark:bg-forest-surface rounded-t-[32px] p-6 pb-10 border-t border-botanical-border dark:border-forest-border max-h-[80%]"
        >
          <View className="flex-row items-center justify-between pb-4 border-b border-botanical-divider dark:border-forest-border">
            <Text className="text-base font-extrabold text-ink dark:text-ink-light tracking-tight">
              Select or Add Tags
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-8 h-8 rounded-full bg-botanical-pearl dark:bg-forest border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={16} color="#64748B" />
            </Pressable>
          </View>

          {/* Custom Tag Input */}
          <View className="flex-row items-center gap-2 mt-4 mb-3">
            <View className="flex-1 flex-row items-center bg-botanical-pearl dark:bg-forest-deep border border-botanical-border dark:border-forest-border rounded-2xl px-3.5 py-2.5">
              <Text className="text-sm font-extrabold text-ink-whisper dark:text-ink-whisper-dark mr-1.5">
                #
              </Text>
              <TextInput
                value={newTagInput}
                onChangeText={setNewTagInput}
                placeholder="Create new tag (e.g. coffee, freelance)"
                placeholderTextColor="#94A3B8"
                className="flex-1 text-xs font-bold text-ink dark:text-ink-light py-0"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              {newTagInput.trim().length > 0 && (
                <Pressable onPress={() => setNewTagInput("")} hitSlop={6}>
                  <Feather name="x" size={13} color="#94A3B8" />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={handleAdd}
              disabled={!newTagInput.trim()}
              className="px-4 py-3 rounded-2xl bg-forest dark:bg-lime items-center justify-center active:scale-95 disabled:opacity-40"
            >
              <Text className="text-xs font-black text-white dark:text-forest">Add</Text>
            </Pressable>
          </View>

          <Text className="text-[10px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark mb-2">
            Available Tags
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-60">
            <View className="flex-row flex-wrap gap-2 py-1">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => onToggleTag(tag)}
                    className={`px-3.5 py-2 rounded-2xl border active:scale-95 shadow-2xs ${
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
                      #{tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            onPress={onClose}
            className="w-full h-12 rounded-2xl bg-forest dark:bg-lime items-center justify-center mt-5 active:scale-98"
          >
            <Text className="text-xs font-black text-white dark:text-forest">Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

