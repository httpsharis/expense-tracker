import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatCurrency, getCurrencySymbol } from "@shared/lib/currency";
import {
  useAccountsWithBalancesQuery,
  useCategoriesQuery,
  useCreateTransactionMutation,
  useTransactionsQuery,
  useUpdateTransactionMutation,
} from "@store/hooks";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

const AVAILABLE_TAGS = [
  "Personal",
  "Business",
  "Dining",
  "Groceries",
  "Transport",
  "Bills",
  "Trip",
  "Tax",
];

/**
 * Clean, safe math evaluator for inline calculations.
 * Respects standard operator precedence (* and / before + and -).
 */
function evaluateExpression(expression: string): number {
  const sanitized = expression.replace(/×/g, "*").replace(/÷/g, "/").trim();
  const clean = sanitized.replace(/[+\-*/]+$/, "").trim();
  if (!clean) return 0;

  const tokens = clean.match(/(\d+(\.\d+)?|[+\-*/])/g);
  if (!tokens || tokens.length === 0) return 0;

  // Pass 1: Multiplication and Division
  const intermediate: (number | string)[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === "*" || token === "/") {
      const prev = intermediate.pop();
      const next = parseFloat(tokens[i + 1]);
      if (typeof prev === "number" && !isNaN(next)) {
        const val = token === "*" ? prev * next : next !== 0 ? prev / next : 0;
        intermediate.push(val);
        i += 2;
        continue;
      }
    }
    const num = parseFloat(token);
    intermediate.push(isNaN(num) ? token : num);
    i++;
  }

  // Pass 2: Addition and Subtraction
  let total = typeof intermediate[0] === "number" ? (intermediate[0] as number) : 0;
  let j = 1;
  while (j < intermediate.length) {
    const op = intermediate[j];
    const nextVal = intermediate[j + 1];
    if (typeof nextVal === "number") {
      if (op === "+") total += nextVal;
      else if (op === "-") total -= nextVal;
    }
    j += 2;
  }

  return Math.max(0, Math.round(total * 100) / 100);
}

export default function AddTransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editId?: string;
    initialType?: "expense" | "income" | "transfer";
  }>();

  const storeCurrency = useUserStore((state) => state.currency);
  const { alert } = usePrompt();

  // Queries & Mutations
  const { data: accounts = [] } = useAccountsWithBalancesQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: liveTransactions = [] } = useTransactionsQuery();
  const createTxMutation = useCreateTransactionMutation();
  const updateTxMutation = useUpdateTransactionMutation();

  const isEditing = Boolean(params.editId);
  const editingTx = useMemo(
    () => (params.editId ? liveTransactions.find((t) => t.id === params.editId) : null),
    [params.editId, liveTransactions]
  );

  // Form State
  const [txType, setTxType] = useState<"expense" | "income" | "transfer">(
    params.initialType || "expense"
  );
  const [amountInput, setAmountInput] = useState("0");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateSelection, setDateSelection] = useState<"today" | "yesterday" | "custom">("today");
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString());

  // Bottom Sheets
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);

  // Populate data when editing
  useEffect(() => {
    if (editingTx) {
      setTxType((editingTx.type as "expense" | "income" | "transfer") || "expense");
      setAmountInput(String(Math.abs(Number(editingTx.amount))));
      setSelectedAccountId(editingTx.account_id);
      setSelectedTransferAccountId(editingTx.transfer_account_id || null);
      setSelectedCategoryId(editingTx.category_id || null);

      const desc = editingTx.description || "";
      const tagMatch = desc.match(/\[(.*?)\]$/);
      if (tagMatch && tagMatch[1]) {
        const parsedTags = tagMatch[1].split(",").map((t) => t.trim());
        setSelectedTags(parsedTags);
        setDescription(desc.replace(/\[(.*?)\]$/, "").trim());
      } else {
        setDescription(desc);
      }

      const txDate = new Date(editingTx.date);
      const todayStr = new Date().toDateString();
      const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
      if (txDate.toDateString() === todayStr) {
        setDateSelection("today");
      } else if (txDate.toDateString() === yesterdayStr) {
        setDateSelection("yesterday");
      } else {
        setDateSelection("custom");
        setCustomDate(editingTx.date);
      }
    }
  }, [editingTx]);

  // Derived Account & Category
  const sourceAccount =
    accounts.find((a) => a.id === selectedAccountId) ??
    accounts.find((a) => a.is_default) ??
    accounts[0];

  const targetAccount = accounts.find((a) => a.id === selectedTransferAccountId);

  const activeCategory =
    categories.find((c) => c.id === selectedCategoryId) ??
    (txType === "expense" ? categories[0] : null);

  const activeCurrency = sourceAccount?.currency || storeCurrency || "PKR";
  const currencySymbol = getCurrencySymbol(activeCurrency);

  // Math Evaluation
  const hasMathOperator = /[+\-×÷]/.test(amountInput);
  const computedAmount = useMemo(() => evaluateExpression(amountInput), [amountInput]);

  // Numpad & Calculator input handlers
  const handleKey = (key: string) => {
    // 1. Math operators
    if (["+", "-", "×", "÷"].includes(key)) {
      if (amountInput === "0") return;
      if (/[+\-×÷]\s*$/.test(amountInput)) {
        setAmountInput((prev) => prev.replace(/[+\-×÷]\s*$/, `${key} `));
      } else {
        setAmountInput((prev) => `${prev} ${key} `);
      }
      return;
    }

    // 2. Clear
    if (key === "CLEAR") {
      setAmountInput("0");
      return;
    }

    // 3. Equals
    if (key === "=") {
      if (hasMathOperator) {
        setAmountInput(computedAmount.toString());
      }
      return;
    }

    // 4. Decimal
    if (key === ".") {
      const segments = amountInput.split(/\s+[+\-×÷]\s+/);
      const currentSegment = segments[segments.length - 1] || "";
      if (!currentSegment.includes(".")) {
        setAmountInput((prev) => (currentSegment === "" ? prev + "0." : prev + "."));
      }
      return;
    }

    // 5. Backspace
    if (key === "BACK") {
      if (amountInput.length <= 1) {
        setAmountInput("0");
        return;
      }
      if (/\s+[+\-×÷]\s+$/.test(amountInput)) {
        setAmountInput((prev) => prev.replace(/\s+[+\-×÷]\s+$/, ""));
      } else {
        setAmountInput((prev) => prev.slice(0, -1));
      }
      return;
    }

    // 6. Digits
    if (amountInput === "0") {
      setAmountInput(key);
    } else {
      const segments = amountInput.split(/\s+[+\-×÷]\s+/);
      const currentSegment = segments[segments.length - 1] || "";
      if (currentSegment.includes(".")) {
        const decimals = currentSegment.split(".")[1];
        if (decimals && decimals.length >= 2) return;
      }
      if (currentSegment.replace(".", "").length >= 9) return;
      setAmountInput((prev) => prev + key);
    }
  };

  const handlePresetAdd = (amount: number) => {
    if (amountInput === "0") {
      setAmountInput(amount.toString());
    } else {
      const current = evaluateExpression(amountInput);
      setAmountInput((current + amount).toString());
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Submit Handler
  const handleSubmit = async () => {
    const finalVal = hasMathOperator ? computedAmount : evaluateExpression(amountInput);

    if (isNaN(finalVal) || finalVal <= 0) {
      await alert({
        title: "Amount Required",
        message: "Please enter a valid amount greater than 0.",
        variant: "warning",
      });
      return;
    }

    if (!sourceAccount?.id) {
      await alert({
        title: "Account Required",
        message: "Please choose a funding account.",
        variant: "warning",
      });
      return;
    }

    if (txType === "transfer") {
      if (!selectedTransferAccountId) {
        await alert({
          title: "Destination Account Required",
          message: "Please choose where to send funds.",
          variant: "warning",
        });
        return;
      }
      if (selectedTransferAccountId === sourceAccount.id) {
        await alert({
          title: "Invalid Transfer",
          message: "Source and destination accounts must be different.",
          variant: "warning",
        });
        return;
      }
    }

    let finalDateIso = new Date().toISOString();
    if (dateSelection === "yesterday") {
      finalDateIso = new Date(Date.now() - 86400000).toISOString();
    } else if (dateSelection === "custom") {
      finalDateIso = customDate;
    }

    const cleanDesc = description.trim();
    const tagSuffix = selectedTags.length > 0 ? ` [${selectedTags.join(", ")}]` : "";
    const defaultLabel =
      txType === "income"
        ? "Deposit"
        : txType === "transfer"
          ? "Account Transfer"
          : activeCategory?.name || "General Expense";

    const fullDescription = `${cleanDesc || defaultLabel}${tagSuffix}`;

    try {
      if (isEditing && editingTx) {
        await updateTxMutation.mutateAsync({
          id: editingTx.id,
          data: {
            account_id: sourceAccount.id,
            transfer_account_id: txType === "transfer" ? selectedTransferAccountId : null,
            amount: finalVal,
            type: txType,
            category_id: txType === "transfer" ? null : activeCategory?.id || null,
            description: fullDescription,
            date: finalDateIso,
          },
        });
      } else {
        await createTxMutation.mutateAsync({
          account_id: sourceAccount.id,
          transfer_account_id: txType === "transfer" ? selectedTransferAccountId : null,
          amount: finalVal,
          type: txType,
          category_id: txType === "transfer" ? null : activeCategory?.id || null,
          description: fullDescription,
          status: "completed",
          input_method: "manual",
          date: finalDateIso,
        });
      }

      setAmountInput("0");
      setDescription("");
      setSelectedTags([]);
      router.replace("/(root)/(tabs)/Transactions" as any);
    } catch (err: any) {
      await alert({
        title: "Transaction Failed",
        message: err.message || "Failed to record transaction.",
        variant: "warning",
      });
    }
  };

  const isPending = createTxMutation.isPending || updateTxMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB] justify-between" edges={["top", "bottom"]}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. QUIET EDITORIAL NAVIGATION HEADER                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View className="px-6 pt-2 pb-1">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="w-10 h-10 rounded-full bg-white border border-[#E4E7EC] items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="arrow-left" size={18} color="#090D16" />
          </Pressable>

          {/* Neo-Banking Segmented Control */}
          <View className="flex-row bg-[#ECEFF3] p-1 rounded-2xl border border-gray-200/50">
            {(["expense", "income", "transfer"] as const).map((type) => {
              const isActive = txType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setTxType(type)}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    isActive ? "bg-white shadow-2xs" : ""
                  }`}
                >
                  <Text
                    className={`text-xs font-bold capitalize ${
                      isActive
                        ? type === "income"
                          ? "text-emerald-700"
                          : type === "transfer"
                            ? "text-blue-700"
                            : "text-[#090D16]"
                        : "text-[#64748B]"
                    }`}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => handleKey("CLEAR")}
            accessibilityRole="button"
            accessibilityLabel="Clear"
            className="w-10 h-10 rounded-full bg-white border border-[#E4E7EC] items-center justify-center active:scale-95 shadow-2xs"
          >
            <Text className="text-xs font-bold text-[#64748B]">C</Text>
          </Pressable>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. THE STAGE (Monumental Typography, Note & Context Strip)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View className="flex-1 justify-center items-center px-6 py-2">
        {/* Big Tabular Hero Display */}
        <View className="items-center justify-center">
          <View className="flex-row items-baseline justify-center">
            <Text className="text-3xl font-extrabold text-[#64748B] mr-2">
              {currencySymbol}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="text-6xl font-black text-[#090D16] tracking-tighter tabular-nums"
            >
              {amountInput}
            </Text>
          </View>

          {/* Equation Result Badge if Calculating */}
          {hasMathOperator ? (
            <View className="flex-row items-center gap-1.5 mt-2 px-3.5 py-1 rounded-full bg-[#D4F938] border border-[#D4F938] shadow-2xs">
              <Feather name="corner-down-right" size={12} color="#090D16" />
              <Text className="text-xs font-black text-[#090D16] tabular-nums">
                = {formatCurrency(computedAmount, activeCurrency)}
              </Text>
            </View>
          ) : (
            <Text className="text-xs font-semibold text-[#64748B] mt-1">
              {txType === "income"
                ? "Incoming cashflow"
                : txType === "transfer"
                  ? "Account rebalance"
                  : "Daily spending"}
            </Text>
          )}
        </View>

        {/* Minimal Editorial Merchant / Purpose Note */}
        <View className="w-full max-w-[300px] mt-4">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add note or merchant..."
            placeholderTextColor="#94A3B8"
            className="text-center text-sm font-semibold text-[#090D16] py-1 px-3 border-b border-[#E4E7EC]"
          />
        </View>

        {/* Quick Amount Add Pills */}
        <View className="flex-row items-center gap-1.5 mt-3">
          {PRESET_AMOUNTS.map((val) => (
            <Pressable
              key={val}
              onPress={() => handlePresetAdd(val)}
              className="px-3 py-1 rounded-full bg-white border border-[#E4E7EC] active:scale-95 shadow-2xs"
            >
              <Text className="text-[11px] font-bold text-[#64748B]">
                +{val >= 1000 ? `${val / 1000}k` : val}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Context Strip: Category • Account • Date • Tags */}
        <View className="w-full mt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              justifyContent: "center",
              flexGrow: 1,
            }}
          >
            {/* Category */}
            {txType !== "transfer" && (
              <Pressable
                onPress={() => setCategorySheetOpen(true)}
                className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E4E7EC] shadow-2xs active:bg-gray-50"
              >
                <Text className="text-sm">{activeCategory?.icon || "🏷️"}</Text>
                <Text className="text-xs font-bold text-[#090D16]">
                  {activeCategory?.name || "Category"}
                </Text>
                <Feather name="chevron-down" size={12} color="#64748B" />
              </Pressable>
            )}

            {/* Account */}
            <Pressable
              onPress={() => setAccountSheetOpen(true)}
              className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E4E7EC] shadow-2xs active:bg-gray-50"
            >
              <Ionicons
                name={txType === "transfer" ? "swap-horizontal" : "card-outline"}
                size={14}
                color={txType === "transfer" ? "#2563EB" : "#090D16"}
              />
              <Text className="text-xs font-bold text-[#090D16]">
                {txType === "transfer"
                  ? `${sourceAccount?.name || "From"} ➔ ${targetAccount?.name || "To"}`
                  : sourceAccount?.name || "Account"}
              </Text>
              <Feather name="chevron-down" size={12} color="#64748B" />
            </Pressable>

            {/* Date */}
            <Pressable
              onPress={() => setDateSheetOpen(true)}
              className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E4E7EC] shadow-2xs active:bg-gray-50"
            >
              <Feather name="calendar" size={12} color="#64748B" />
              <Text className="text-xs font-bold text-[#090D16] capitalize">
                {dateSelection}
              </Text>
              <Feather name="chevron-down" size={12} color="#64748B" />
            </Pressable>

            {/* Tags */}
            <Pressable
              onPress={() => setTagsSheetOpen(true)}
              className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-2xl border active:bg-gray-50 ${
                selectedTags.length > 0
                  ? "bg-[#D4F938]/30 border-[#D4F938]"
                  : "bg-white border-[#E4E7EC] shadow-2xs"
              }`}
            >
              <Feather name="hash" size={12} color="#090D16" />
              <Text className="text-xs font-bold text-[#090D16]">
                {selectedTags.length > 0
                  ? `${selectedTags.length} ${selectedTags.length === 1 ? "tag" : "tags"}`
                  : "Tags"}
              </Text>
              <Feather name="chevron-down" size={12} color="#64748B" />
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CALCULATOR OPERATOR BAR & PROPORTIONAL NUMPAD              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View className="w-full px-5 pb-3">
        {/* Sleek Arithmetic Operator Strip */}
        <View className="flex-row gap-2 mb-2">
          {["+", "-", "×", "÷", "="].map((op) => (
            <Pressable
              key={op}
              onPress={() => handleKey(op)}
              className="flex-1 h-10 rounded-xl bg-white border border-[#E4E7EC] items-center justify-center shadow-2xs active:bg-gray-100 active:scale-95"
            >
              <Text className="text-base font-extrabold text-[#090D16]">{op}</Text>
            </Pressable>
          ))}
        </View>

        {/* Natural 3x4 Numpad */}
        <View className="gap-2">
          {/* Row 1 */}
          <View className="flex-row gap-2">
            {["1", "2", "3"].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleKey(num)}
                className="flex-1 h-14 rounded-2xl bg-white border border-[#E4E7EC] items-center justify-center shadow-2xs active:bg-gray-100 active:scale-95"
              >
                <Text className="text-2xl font-bold text-[#090D16]">{num}</Text>
              </Pressable>
            ))}
          </View>

          {/* Row 2 */}
          <View className="flex-row gap-2">
            {["4", "5", "6"].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleKey(num)}
                className="flex-1 h-14 rounded-2xl bg-white border border-[#E4E7EC] items-center justify-center shadow-2xs active:bg-gray-100 active:scale-95"
              >
                <Text className="text-2xl font-bold text-[#090D16]">{num}</Text>
              </Pressable>
            ))}
          </View>

          {/* Row 3 */}
          <View className="flex-row gap-2">
            {["7", "8", "9"].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleKey(num)}
                className="flex-1 h-14 rounded-2xl bg-white border border-[#E4E7EC] items-center justify-center shadow-2xs active:bg-gray-100 active:scale-95"
              >
                <Text className="text-2xl font-bold text-[#090D16]">{num}</Text>
              </Pressable>
            ))}
          </View>

          {/* Row 4 */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleKey(".")}
              className="flex-1 h-14 rounded-2xl bg-white border border-[#E4E7EC] items-center justify-center shadow-2xs active:bg-gray-100 active:scale-95"
            >
              <Text className="text-2xl font-bold text-[#090D16]">.</Text>
            </Pressable>

            <Pressable
              onPress={() => handleKey("0")}
              className="flex-1 h-14 rounded-2xl bg-white border border-[#E4E7EC] items-center justify-center shadow-2xs active:bg-gray-100 active:scale-95"
            >
              <Text className="text-2xl font-bold text-[#090D16]">0</Text>
            </Pressable>

            <Pressable
              onPress={() => handleKey("BACK")}
              className="flex-1 h-14 rounded-2xl bg-white border border-[#E4E7EC] items-center justify-center shadow-2xs active:bg-gray-100 active:scale-95"
            >
              <Ionicons name="backspace-outline" size={22} color="#090D16" />
            </Pressable>
          </View>
        </View>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. DOCKED STUDIO VAULT PRIMARY ACTION CTA                     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <View className="mt-3">
          <Pressable
            onPress={hasMathOperator ? () => handleKey("=") : handleSubmit}
            disabled={isPending}
            className="w-full h-14 bg-[#090D16] rounded-2xl flex-row items-center justify-center gap-2 active:scale-98 shadow-sm border border-[#232838] disabled:opacity-50"
          >
            <Feather
              name={hasMathOperator ? "check" : isEditing ? "save" : "plus"}
              size={18}
              color="#D4F938"
            />
            <Text className="text-sm font-black text-white tracking-wide">
              {isPending
                ? "Saving..."
                : hasMathOperator
                  ? `Calculate (${formatCurrency(computedAmount, activeCurrency)})`
                  : isEditing
                    ? "Update transaction"
                    : txType === "income"
                      ? `Record income • ${formatCurrency(computedAmount, activeCurrency)}`
                      : txType === "transfer"
                        ? `Transfer funds • ${formatCurrency(computedAmount, activeCurrency)}`
                        : `Add expense • ${formatCurrency(computedAmount, activeCurrency)}`}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. SLICK BOTTOM SHEETS (Category • Account • Date • Tags)      */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* Category Sheet */}
      <Modal
        visible={categorySheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategorySheetOpen(false)}
      >
        <Pressable
          onPress={() => setCategorySheetOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 pb-10 max-h-[75%]"
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <Text className="text-base font-extrabold text-[#090D16]">
                Select category
              </Text>
              <Pressable onPress={() => setCategorySheetOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView className="mt-4">
              <View className="flex-row flex-wrap gap-2.5">
                {categories.map((cat) => {
                  const isSelected = (activeCategory?.id ?? categories[0]?.id) === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        setCategorySheetOpen(false);
                      }}
                      className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl border active:scale-95 ${
                        isSelected
                          ? "border-[#D4F938] bg-[#D4F938]/20"
                          : "border-[#E4E7EC] bg-[#F8F9FB]"
                      }`}
                    >
                      <Text className="text-base">{cat.icon || "🏷️"}</Text>
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? "text-[#090D16]" : "text-[#64748B]"
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

      {/* Account Sheet */}
      <Modal
        visible={accountSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountSheetOpen(false)}
      >
        <Pressable
          onPress={() => setAccountSheetOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 pb-10 max-h-[75%]"
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <Text className="text-base font-extrabold text-[#090D16]">
                {txType === "transfer" ? "Select accounts" : "Payment account"}
              </Text>
              <Pressable onPress={() => setAccountSheetOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView className="mt-4">
              {txType === "transfer" ? (
                <View className="gap-4">
                  {/* From Account */}
                  <View>
                    <Text className="text-xs font-bold text-[#64748B] mb-2 uppercase tracking-wider">
                      From account
                    </Text>
                    <View className="gap-2">
                      {accounts.map((acc) => (
                        <Pressable
                          key={`from-${acc.id}`}
                          onPress={() => setSelectedAccountId(acc.id)}
                          className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                            (selectedAccountId ?? sourceAccount?.id) === acc.id
                              ? "border-[#090D16] bg-[#090D16]/5"
                              : "border-[#E4E7EC] bg-[#F8F9FB]"
                          }`}
                        >
                          <Text className="text-xs font-extrabold text-[#090D16]">
                            {acc.name}
                          </Text>
                          <Text className="text-xs font-bold text-[#64748B] tabular-nums">
                            {formatCurrency(acc.balance, acc.currency)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* To Account */}
                  <View>
                    <Text className="text-xs font-bold text-[#64748B] mb-2 uppercase tracking-wider">
                      To account
                    </Text>
                    <View className="gap-2">
                      {accounts
                        .filter((a) => a.id !== (selectedAccountId ?? sourceAccount?.id))
                        .map((acc) => (
                          <Pressable
                            key={`to-${acc.id}`}
                            onPress={() => setSelectedTransferAccountId(acc.id)}
                            className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                              selectedTransferAccountId === acc.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-[#E4E7EC] bg-[#F8F9FB]"
                            }`}
                          >
                            <Text className="text-xs font-extrabold text-[#090D16]">
                              {acc.name}
                            </Text>
                            <Text className="text-xs font-bold text-[#64748B] tabular-nums">
                              {formatCurrency(acc.balance, acc.currency)}
                            </Text>
                          </Pressable>
                        ))}
                    </View>
                  </View>

                  <Pressable
                    onPress={() => setAccountSheetOpen(false)}
                    className="w-full h-12 rounded-2xl bg-[#090D16] items-center justify-center mt-2"
                  >
                    <Text className="text-xs font-black text-white">Done</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="gap-2">
                  {accounts.map((acc) => (
                    <Pressable
                      key={acc.id}
                      onPress={() => {
                        setSelectedAccountId(acc.id);
                        setAccountSheetOpen(false);
                      }}
                      className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                        (selectedAccountId ?? sourceAccount?.id) === acc.id
                          ? "border-[#D4F938] bg-[#D4F938]/15"
                          : "border-[#E4E7EC] bg-[#F8F9FB]"
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-gray-200">
                          <Ionicons name="card-outline" size={20} color="#090D16" />
                        </View>
                        <View>
                          <Text className="text-sm font-extrabold text-[#090D16]">
                            {acc.name}
                          </Text>
                          <Text className="text-xs text-[#64748B] capitalize">
                            {acc.type} • {acc.currency}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm font-black text-[#090D16] tabular-nums">
                        {formatCurrency(acc.balance, acc.currency)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date Sheet */}
      <Modal
        visible={dateSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateSheetOpen(false)}
      >
        <Pressable
          onPress={() => setDateSheetOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 pb-10"
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <Text className="text-base font-extrabold text-[#090D16]">
                Transaction date
              </Text>
              <Pressable onPress={() => setDateSheetOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View className="gap-2.5 mt-4">
              {[
                { id: "today", label: "Today", desc: "Current date & time" },
                { id: "yesterday", label: "Yesterday", desc: "1 day ago" },
                { id: "custom", label: "Custom date", desc: "Select custom date" },
              ].map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setDateSelection(opt.id as any);
                    setDateSheetOpen(false);
                  }}
                  className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                    dateSelection === opt.id
                      ? "border-[#D4F938] bg-[#D4F938]/15"
                      : "border-[#E4E7EC] bg-[#F8F9FB]"
                  }`}
                >
                  <View>
                    <Text className="text-xs font-black text-[#090D16]">
                      {opt.label}
                    </Text>
                    <Text className="text-[11px] text-[#64748B]">{opt.desc}</Text>
                  </View>
                  {dateSelection === opt.id && (
                    <Feather name="check" size={16} color="#090D16" />
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tags Sheet */}
      <Modal
        visible={tagsSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTagsSheetOpen(false)}
      >
        <Pressable
          onPress={() => setTagsSheetOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 pb-10"
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <Text className="text-base font-extrabold text-[#090D16]">
                Select tags
              </Text>
              <Pressable onPress={() => setTagsSheetOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View className="flex-row flex-wrap gap-2.5 mt-4">
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className={`px-4 py-2.5 rounded-2xl border active:scale-95 ${
                      isSelected
                        ? "bg-[#090D16] border-[#090D16]"
                        : "bg-[#F8F9FB] border-[#E4E7EC]"
                    }`}
                  >
                    <Text
                      className={`text-xs font-black ${
                        isSelected ? "text-[#D4F938]" : "text-[#64748B]"
                      }`}
                    >
                      #{tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setTagsSheetOpen(false)}
              className="w-full h-12 rounded-2xl bg-[#090D16] items-center justify-center mt-6"
            >
              <Text className="text-xs font-black text-white">Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
