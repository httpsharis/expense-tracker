import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_CATEGORIES } from "../../../../services/categories";
import type { BudgetFormModalProps, BudgetPeriod, SaveBudgetPayload } from "../types";

const PERIODS: Array<{ key: BudgetPeriod; label: string }> = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Custom" },
];

const INCREMENTS = [1000, 5000, 10000, 25000];

export function BudgetFormModal({
  visible,
  mode,
  categories,
  accounts = [],
  initialBudget,
  currency = "PKR",
  onClose,
  onSave,
  onDelete,
  isSaving,
  budgetId,
  initialCategoryId,
  initialAmount,
  initialConfig,
}: BudgetFormModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("month");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [error, setError] = useState("");

  const activeCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    return DEFAULT_CATEGORIES.map((c, i) => ({
      id: `default-${i}`,
      name: c.name,
      icon: c.icon,
      is_default: true,
      created_at: new Date().toISOString(),
      user_id: "default",
    }));
  }, [categories]);

  useEffect(() => {
    if (!visible) return;
    setError("");

    const config = initialBudget || initialConfig || {};
    const effectiveName = config.name || "";
    const effectiveAmount = config.amount ?? initialAmount ?? "";
    const effectivePeriod = config.period_type || config.period || "month";
    const effectiveCatId =
      config.category_id ?? config.categoryId ?? initialCategoryId ?? null;
    const effectiveAccId = config.account_id ?? config.accountId ?? null;

    setName(effectiveName);
    setAmount(effectiveAmount ? String(effectiveAmount) : "");
    setPeriod(effectivePeriod);
    setCategoryId(effectiveCatId === "all" ? null : effectiveCatId);
    setAccountId(effectiveAccId === "all" ? null : effectiveAccId);
    setCustomStart(config.period_start || "");
    setCustomEnd(config.period_end || "");
  }, [visible, initialBudget, initialConfig, initialAmount, initialCategoryId]);

  const handleAddIncrement = (inc: number) => {
    const curr = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
    setAmount(String(Math.round(curr + inc)));
    setError("");
  };

  const handleClearAmount = () => {
    setAmount("");
    setError("");
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (period === "custom" && (!customStart || !customEnd)) {
      setError("Please specify both start and end dates (YYYY-MM-DD)");
      return;
    }

    const resolvedName =
      name.trim() ||
      (categoryId
        ? activeCategories.find((c) => c.id === categoryId)?.name || "Category Budget"
        : accountId
        ? accounts.find((a) => a.id === accountId)?.name || "Account Budget"
        : "Total Budget");

    const payload: SaveBudgetPayload = {
      id: initialBudget?.id || budgetId,
      name: resolvedName,
      amount: numAmount,
      period_type: period,
      category_id: categoryId,
      account_id: accountId,
      period_start: period === "custom" ? customStart : null,
      period_end: period === "custom" ? customEnd : null,
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save budget");
    }
  };

  const selectedCategory = activeCategories.find((c) => c.id === categoryId);
  const selectedAccount = accounts.find((a) => a.id === accountId);

  // Dynamic scope helper text
  const scopeExplanation = useMemo(() => {
    if (!categoryId && !accountId) {
      return "All spending across every category and account automatically debits this budget.";
    }
    if (categoryId && !accountId) {
      return `Only transactions under "${selectedCategory?.name || "selected category"}" count toward this limit.`;
    }
    if (!categoryId && accountId) {
      return `Only transactions paid from "${selectedAccount?.name || "selected account"}" count toward this limit.`;
    }
    return `Only transactions under "${selectedCategory?.name}" paid from "${selectedAccount?.name}" count toward this limit.`;
  }, [categoryId, accountId, selectedCategory, selectedAccount]);

  const nameSuggestions = useMemo(() => {
    if (selectedCategory) {
      return [selectedCategory.name, `${selectedCategory.name} Budget`];
    }
    return ["Total Budget", "Daily Discretionary", "Groceries", "Dining Out", "Weekend Fun"];
  }, [selectedCategory]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-[#F8F9FB]">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          {/* Top Sheet Grab Indicator */}
          <View className="items-center pt-2.5 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#D0D5DD]" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-2 pb-4 border-b border-[#E4E7EC] bg-white">
            <View>
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <View className="w-1.5 h-1.5 rounded-full bg-[#D4F938]" />
                <Text className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                  {mode === "create" ? "NEW SPENDING LIMIT" : "EDITING BUDGET"}
                </Text>
              </View>
              <Text className="text-xl font-black text-[#090D16] tracking-tight">
                {mode === "create" ? "New Budget" : "Edit Budget"}
              </Text>
              <Text className="text-[11px] font-medium text-[#64748B] mt-0.5">
                Auto-tracks live against your ledger transactions
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              className="w-8 h-8 rounded-full bg-white border border-[#E4E7EC] items-center justify-center active:scale-95 shadow-2xs"
            >
              <Feather name="x" size={15} color="#090D16" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 p-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            <View className="gap-5">
              {/* 1. HERO AMOUNT CARD */}
              <View className="bg-white rounded-3xl p-5 border border-[#E4E7EC] shadow-[0_6px_24px_rgba(9,13,22,0.05)]">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-1.5">
                    <Feather name="target" size={12} color="#090D16" />
                    <Text className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">
                      Spending Limit Amount
                    </Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-full bg-[#F4F5F7] border border-[#E4E7EC]">
                    <Text className="text-[10px] font-black text-[#090D16] tracking-wider">
                      {currency}
                    </Text>
                  </View>
                </View>

                {/* Big Numeric Input Display */}
                <View className="flex-row items-center py-2 border-b border-[#F4F5F7]">
                  <Text className="text-2xl font-bold text-[#94A3B8] mr-2">
                    {currency === "PKR" ? "₨" : "$"}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={(val) => {
                      setAmount(val);
                      setError("");
                    }}
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    keyboardType="numeric"
                    autoFocus={mode === "create"}
                    className="flex-1 text-4xl font-black text-[#090D16] tracking-tight py-1"
                  />
                  {amount.length > 0 && (
                    <Pressable
                      onPress={handleClearAmount}
                      hitSlop={8}
                      className="w-7 h-7 rounded-full bg-[#F4F5F7] items-center justify-center active:scale-95"
                    >
                      <Feather name="x" size={13} color="#64748B" />
                    </Pressable>
                  )}
                </View>

                {/* Tactile Quick Increment Strip */}
                <View className="pt-3">
                  <Text className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
                    Quick Add
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {INCREMENTS.map((inc) => (
                      <Pressable
                        key={inc}
                        onPress={() => handleAddIncrement(inc)}
                        accessibilityRole="button"
                        className="px-3 py-1.5 rounded-xl bg-[#F8F9FB] border border-[#E4E7EC] active:scale-95 shadow-2xs active:bg-[#ECEEF2]"
                      >
                        <Text className="text-xs font-bold text-[#090D16]">
                          +{inc.toLocaleString()}
                        </Text>
                      </Pressable>
                    ))}
                    {amount.length > 0 && (
                      <Pressable
                        onPress={handleClearAmount}
                        accessibilityRole="button"
                        className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 active:scale-95 shadow-2xs"
                      >
                        <Text className="text-xs font-bold text-rose-600">
                          Clear
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              {/* 2. BUDGET NAME CARD */}
              <View className="bg-white rounded-3xl p-4 border border-[#E4E7EC] shadow-2xs">
                <Text className="text-[10px] font-black text-[#64748B] mb-2 uppercase tracking-widest">
                  Budget Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    setError("");
                  }}
                  placeholder="e.g. Total Budget, Groceries, Dining Out"
                  placeholderTextColor="#94A3B8"
                  className="h-11 px-3.5 rounded-xl bg-[#F8F9FB] border border-[#E4E7EC] text-sm font-bold text-[#090D16]"
                />

                {/* Suggestions pill strip if name is empty */}
                {!name && (
                  <View className="flex-row flex-wrap items-center gap-1.5 mt-2.5">
                    <Text className="text-[10px] font-bold text-[#94A3B8] mr-1">
                      Suggestions:
                    </Text>
                    {nameSuggestions.slice(0, 3).map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        onPress={() => setName(suggestion)}
                        className="px-2.5 py-1 rounded-lg bg-[#F4F5F7] border border-[#E4E7EC] active:scale-95"
                      >
                        <Text className="text-[11px] font-semibold text-[#525866]">
                          {suggestion}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* 3. TACTILE PERIOD SELECTOR */}
              <View className="bg-white rounded-3xl p-4 border border-[#E4E7EC] shadow-2xs">
                <Text className="text-[10px] font-black text-[#64748B] mb-2 uppercase tracking-widest">
                  Period / Cycle
                </Text>

                <View className="bg-[#ECEEF2] p-1 rounded-2xl flex-row gap-1">
                  {PERIODS.map((p) => {
                    const isSelected = period === p.key;
                    return (
                      <Pressable
                        key={p.key}
                        onPress={() => setPeriod(p.key)}
                        accessibilityRole="button"
                        className={`flex-1 py-2 rounded-xl items-center justify-center active:scale-97 ${
                          isSelected
                            ? "bg-[#090D16] shadow-xs"
                            : "bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? "text-white font-black" : "text-[#64748B]"
                          }`}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom Period Dates */}
                {period === "custom" && (
                  <View className="flex-row gap-3 mt-3 pt-3 border-t border-[#F4F5F7]">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-[#64748B] mb-1">
                        Start Date
                      </Text>
                      <TextInput
                        value={customStart}
                        onChangeText={setCustomStart}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        className="h-10 px-3 rounded-xl bg-[#F8F9FB] border border-[#E4E7EC] text-xs font-semibold text-[#090D16]"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-[#64748B] mb-1">
                        End Date
                      </Text>
                      <TextInput
                        value={customEnd}
                        onChangeText={setCustomEnd}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        className="h-10 px-3 rounded-xl bg-[#F8F9FB] border border-[#E4E7EC] text-xs font-semibold text-[#090D16]"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* 4. OPTIONAL CATEGORY FILTER */}
              <View className="bg-white rounded-3xl p-4 border border-[#E4E7EC] shadow-2xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">
                    Category Filter (Optional)
                  </Text>
                  {categoryId && (
                    <Pressable
                      onPress={() => setCategoryId(null)}
                      className="px-2 py-0.5 rounded-md bg-[#F4F5F7]"
                    >
                      <Text className="text-[10px] font-bold text-[#090D16]">
                        Reset (All)
                      </Text>
                    </Pressable>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  className="py-1"
                >
                  <Pressable
                    onPress={() => setCategoryId(null)}
                    accessibilityRole="button"
                    className={`flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl border active:scale-97 ${
                      !categoryId
                        ? "bg-[#090D16] border-[#090D16] shadow-xs"
                        : "bg-white border-[#E4E7EC] shadow-2xs"
                    }`}
                  >
                    <Text className="text-sm">🌐</Text>
                    <Text
                      className={`text-xs font-bold ${
                        !categoryId ? "text-white font-black" : "text-[#525866]"
                      }`}
                    >
                      All Categories
                    </Text>
                  </Pressable>

                  {activeCategories.map((c) => {
                    const isSelected = categoryId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setCategoryId(c.id)}
                        accessibilityRole="button"
                        className={`flex-row items-center gap-1.5 px-3 py-2.5 rounded-xl border active:scale-97 ${
                          isSelected
                            ? "bg-[#090D16] border-[#090D16] shadow-xs"
                            : "bg-white border-[#E4E7EC] shadow-2xs"
                        }`}
                      >
                        <Text className="text-sm">{c.icon || "🏷️"}</Text>
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? "text-white font-black" : "text-[#090D16]"
                          }`}
                        >
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 5. OPTIONAL ACCOUNT FILTER */}
              <View className="bg-white rounded-3xl p-4 border border-[#E4E7EC] shadow-2xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">
                    Account Filter (Optional)
                  </Text>
                  {accountId && (
                    <Pressable
                      onPress={() => setAccountId(null)}
                      className="px-2 py-0.5 rounded-md bg-[#F4F5F7]"
                    >
                      <Text className="text-[10px] font-bold text-[#090D16]">
                        Reset (All)
                      </Text>
                    </Pressable>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  className="py-1"
                >
                  <Pressable
                    onPress={() => setAccountId(null)}
                    accessibilityRole="button"
                    className={`flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl border active:scale-97 ${
                      !accountId
                        ? "bg-[#090D16] border-[#090D16] shadow-xs"
                        : "bg-white border-[#E4E7EC] shadow-2xs"
                    }`}
                  >
                    <Text className="text-sm">🏛️</Text>
                    <Text
                      className={`text-xs font-bold ${
                        !accountId ? "text-white font-black" : "text-[#525866]"
                      }`}
                    >
                      All Accounts
                    </Text>
                  </Pressable>

                  {accounts.map((acc) => {
                    const isSelected = accountId === acc.id;
                    const icon =
                      acc.type === "cash"
                        ? "💵"
                        : acc.type === "savings"
                        ? "🪙"
                        : "🏦";

                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setAccountId(acc.id)}
                        accessibilityRole="button"
                        className={`flex-row items-center gap-1.5 px-3 py-2.5 rounded-xl border active:scale-97 ${
                          isSelected
                            ? "bg-[#090D16] border-[#090D16] shadow-xs"
                            : "bg-white border-[#E4E7EC] shadow-2xs"
                        }`}
                      >
                        <Text className="text-sm">{icon}</Text>
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? "text-white font-black" : "text-[#090D16]"
                          }`}
                        >
                          {acc.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 6. ARCHITECTURAL AUTO-MATCH LEDGER RULE CARD */}
              <View className="bg-[#090D16] rounded-3xl p-5 border border-[#232838] shadow-[0_8px_25px_rgba(9,13,22,0.12)]">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="px-2.5 py-0.5 rounded-full bg-[#D4F938]/15 border border-[#D4F938]/30 flex-row items-center gap-1">
                      <View className="w-1.5 h-1.5 rounded-full bg-[#D4F938]" />
                      <Text className="text-[10px] font-black text-[#D4F938] uppercase tracking-wider">
                        Auto-Match Rule
                      </Text>
                    </View>
                  </View>
                  <Feather name="layers" size={13} color="#D4F938" />
                </View>

                {/* Scope chips */}
                <View className="flex-row flex-wrap gap-2 mb-3">
                  <View className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10">
                    <Text className="text-[11px] font-bold text-white">
                      ⏱️ {period.charAt(0).toUpperCase() + period.slice(1)} cycle
                    </Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10">
                    <Text className="text-[11px] font-bold text-white">
                      {selectedCategory ? `${selectedCategory.icon || "🏷️"} ${selectedCategory.name}` : "🌐 All categories"}
                    </Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10">
                    <Text className="text-[11px] font-bold text-white">
                      {selectedAccount ? `🏦 ${selectedAccount.name}` : "🏛️ All accounts"}
                    </Text>
                  </View>
                </View>

                <Text className="text-xs font-semibold text-white/80 leading-relaxed">
                  {scopeExplanation}
                </Text>

                <Text className="text-[10px] text-white/40 mt-2 font-medium">
                  Ledger transactions matching this criteria debit the limit dynamically.
                </Text>
              </View>

              {/* Error Notice */}
              {error ? (
                <View className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex-row items-center gap-2">
                  <Feather name="alert-circle" size={14} color="#E11D48" />
                  <Text className="text-xs font-bold text-[#E11D48] flex-1">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* 7. PRIMARY ACTION BUTTON */}
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                accessibilityRole="button"
                className="h-14 bg-[#090D16] rounded-2xl flex-row items-center justify-center gap-2 active:scale-98 shadow-[0_8px_20px_rgba(9,13,22,0.2)] border border-[#232838]"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#D4F938" />
                    <Text className="text-sm font-black text-white tracking-wide">
                      {mode === "create" ? "Create Budget Limit" : "Save Changes"}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Delete Button (in edit mode) */}
              {mode === "edit" && onDelete && (
                <Pressable
                  onPress={() => {
                    const idToDelete = initialBudget?.id || budgetId;
                    if (idToDelete) onDelete(idToDelete);
                  }}
                  disabled={isSaving}
                  accessibilityRole="button"
                  className="h-12 bg-rose-50 border border-rose-100 rounded-2xl flex-row items-center justify-center gap-2 active:scale-98"
                >
                  <Feather name="trash-2" size={14} color="#E11D48" />
                  <Text className="text-xs font-bold text-[#E11D48]">
                    Delete This Budget
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
