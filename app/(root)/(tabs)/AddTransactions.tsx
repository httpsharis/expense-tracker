import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AccountSheetModal,
  CategorySheetModal,
  DateSheetModal,
  ReceiptScannerModal,
  TagsSheetModal,
  TransactionSplitSheet,
  useTransactionForm,
} from "@features/transactions";
import { CategoryIcon } from "@shared/components/CategoryIcon";
import { formatCurrency } from "@shared/lib/currency";

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

export default function AddTransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editId?: string;
    type?: "expense" | "income" | "transfer";
    initialType?: "expense" | "income" | "transfer";
    initialAmount?: string;
    initialDescription?: string;
    initialCategory?: string;
  }>();

  const {
    isEditing,
    editEligibility,
    isPending,
    txType,
    setTxType,
    amountInput,
    hasMathOperator,
    computedAmount,
    accounts,
    categories,
    sourceAccount,
    targetAccount,
    activeCategory,
    activeCurrency,
    currencySymbol,
    selectedAccountId,
    setSelectedAccountId,
    selectedTransferAccountId,
    setSelectedTransferAccountId,
    selectedCategoryId,
    setSelectedCategoryId,
    description,
    setDescription,
    selectedTags,
    toggleTag,
    dateSelection,
    setDateSelection,
    customDate,
    setCustomDate,
    groups,
    peopleSummaries,
    selectedSplitGroup,
    setSelectedSplitGroup,
    selectedSplitPerson,
    setSelectedSplitPerson,
    splitPaidBy,
    setSplitPaidBy,
    splitPreviewText,
    swapTransferAccounts,
    customTags,
    addCustomTag,
    handleKey,
    applyScannedReceipt,
    handleSubmit,
  } = useTransactionForm({
    editId: params.editId,
    initialType: params.initialType || params.type,
    initialAmount: params.initialAmount,
    initialDescription: params.initialDescription,
    initialCategory: params.initialCategory,
  });

  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [accountPickerTarget, setAccountPickerTarget] = useState<"source" | "target">("source");
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);
  const [splitSheetOpen, setSplitSheetOpen] = useState(false);

  const isAmountLocked = isEditing && !editEligibility.canEditAmountAndAccount;
  const allAvailableTags = Array.from(new Set([...AVAILABLE_TAGS, ...customTags]));

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-forest-deep"
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-between"
      >
        {/* ── 1. CLEAN TOP NAVIGATION & TYPE SELECTOR ── */}
        <Animated.View
          entering={FadeInDown.duration(240)}
          className="px-5 pt-1 pb-1"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(root)/(tabs)")
              }
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="w-10 h-10 rounded-full bg-botanical-pearl dark:bg-forest-surface border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95 shadow-2xs"
            >
              <Feather name="arrow-left" size={18} color="#64748B" />
            </Pressable>

            {/* Direct Segmented Control */}
            <View
              className={`flex-row bg-botanical-pearl dark:bg-forest-surface p-1 rounded-2xl border border-botanical-border dark:border-forest-border ${
                isAmountLocked ? "opacity-50" : ""
              }`}
            >
              {(["expense", "income", "transfer"] as const).map((type) => {
                const isActive = txType === type;
                return (
                  <Pressable
                    key={type}
                    disabled={isAmountLocked}
                    onPress={() => setTxType(type)}
                    className={`px-4 py-1.5 rounded-xl transition-all active:scale-95 ${
                      isActive ? "bg-white dark:bg-forest-deep shadow-2xs" : ""
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold capitalize ${
                        isActive
                          ? type === "income"
                            ? "text-emerald-600 dark:text-lime"
                            : type === "transfer"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-ink dark:text-ink-light"
                          : "text-ink-muted dark:text-ink-muted-dark"
                      }`}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Top Action Cluster (Camera Scan + Clear Amount) */}
            <View className="flex-row items-center gap-1.5">
              {!isAmountLocked && (
                <Pressable
                  onPress={() => setScannerModalOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Scan receipt with camera"
                  className="w-10 h-10 rounded-full bg-botanical-pearl dark:bg-forest-surface border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95 shadow-2xs"
                >
                  <Feather name="camera" size={17} color="#22C55E" />
                </Pressable>
              )}

              <Pressable
                disabled={isAmountLocked}
                onPress={() => handleKey("CLEAR")}
                accessibilityRole="button"
                accessibilityLabel="Clear amount"
                className={`w-10 h-10 rounded-full bg-botanical-pearl dark:bg-forest-surface border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95 shadow-2xs ${
                  isAmountLocked ? "opacity-40" : ""
                }`}
              >
                <Text className="text-xs font-black text-ink-muted dark:text-ink-muted-dark">
                  C
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ── 2. SCROLLABLE UPPER STAGE (HERO AMOUNT + UNIFIED DETAILS) ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-start", paddingBottom: 6 }}
        >
          {/* Hero Amount Display */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(35)}
            layout={LinearTransition.springify().damping(20).stiffness(180)}
            className="items-center justify-center pt-2 pb-2 px-6"
          >
            <View className="flex-row items-baseline justify-center">
              <Text className="text-2xl font-extrabold text-ink-whisper dark:text-ink-whisper-dark mr-2 pb-1">
                {currencySymbol}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className="text-5xl font-black text-ink dark:text-ink-light tracking-tight tabular-nums"
              >
                {amountInput}
              </Text>
            </View>

            {/* Math Expression Output / Lock reason */}
            {editEligibility.lockReason ? (
              <View className="flex-row items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Feather name="lock" size={11} color="#D97706" />
                <Text className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {editEligibility.lockReason}
                </Text>
              </View>
            ) : hasMathOperator ? (
              <View className="flex-row items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Feather name="corner-down-right" size={12} color="#16A34A" />
                <Text className="text-xs font-black text-emerald-600 dark:text-lime tabular-nums">
                  = {formatCurrency(computedAmount, activeCurrency)}
                </Text>
              </View>
            ) : null}
          </Animated.View>

          {/* ── 3. UNIFIED MINIMALIST TRANSACTION DETAILS CARD ── */}
          <Animated.View
            entering={FadeInDown.duration(320).delay(75)}
            layout={LinearTransition.springify().damping(20).stiffness(180)}
            className="px-5 mt-1"
          >
            <Animated.View
              layout={LinearTransition.springify().damping(20).stiffness(180)}
              className="bg-white dark:bg-forest-surface rounded-3xl p-4 border border-botanical-border dark:border-forest-border shadow-2xs"
            >
              {/* Row 1: Category & Account Selectors (or Transfer Route) */}
              {txType === "transfer" ? (
                /* Transfer Direct Route: From Account ⇄ To Account */
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[10px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark">
                      Transfer Route
                    </Text>
                    <Pressable
                      disabled={isAmountLocked}
                      onPress={swapTransferAccounts}
                      className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 active:scale-95"
                    >
                      <Ionicons name="swap-horizontal" size={12} color="#2563EB" />
                      <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        Swap
                      </Text>
                    </Pressable>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {/* From Account Tile */}
                    <Pressable
                      disabled={isAmountLocked}
                      onPress={() => {
                        setAccountPickerTarget("source");
                        setAccountSheetOpen(true);
                      }}
                      className="flex-1 bg-botanical-pearl dark:bg-forest-deep p-3 rounded-2xl border border-botanical-border dark:border-forest-border active:scale-98"
                    >
                      <Text className="text-[9px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark mb-0.5">
                        From
                      </Text>
                      <Text className="text-xs font-bold text-ink dark:text-ink-light" numberOfLines={1}>
                        {sourceAccount?.name || "Select"}
                      </Text>
                      <Text className="text-[10px] text-ink-muted dark:text-ink-muted-dark mt-0.5 tabular-nums">
                        {sourceAccount ? formatCurrency(sourceAccount.balance, sourceAccount.currency) : "—"}
                      </Text>
                    </Pressable>

                    <Ionicons name="arrow-forward" size={14} color="#64748B" />

                    {/* To Account Tile */}
                    <Pressable
                      disabled={isAmountLocked}
                      onPress={() => {
                        setAccountPickerTarget("target");
                        setAccountSheetOpen(true);
                      }}
                      className={`flex-1 p-3 rounded-2xl border active:scale-98 ${
                        !targetAccount || targetAccount.id === sourceAccount?.id
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "bg-botanical-pearl dark:bg-forest-deep border-botanical-border dark:border-forest-border"
                      }`}
                    >
                      <Text className="text-[9px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark mb-0.5">
                        To
                      </Text>
                      <Text className="text-xs font-bold text-ink dark:text-ink-light" numberOfLines={1}>
                        {targetAccount?.name || "Select"}
                      </Text>
                      <Text className="text-[10px] text-ink-muted dark:text-ink-muted-dark mt-0.5 tabular-nums">
                        {targetAccount ? formatCurrency(targetAccount.balance, targetAccount.currency) : "Select"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* Expense / Income: Side-by-Side Category & Account Selectors */
                <View className="flex-row items-center gap-2">
                  {/* Category Picker Tile */}
                  <Pressable
                    onPress={() => setCategorySheetOpen(true)}
                    className="flex-1 bg-botanical-pearl dark:bg-forest-deep p-3 rounded-2xl border border-botanical-border dark:border-forest-border flex-row items-center justify-between active:scale-98"
                  >
                    <View className="flex-row items-center gap-2 flex-1 mr-1">
                      <CategoryIcon icon={activeCategory?.icon} size={18} color="#22C55E" />
                      <View className="flex-1">
                        <Text className="text-[9px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark">
                          Category
                        </Text>
                        <Text className="text-xs font-bold text-ink dark:text-ink-light" numberOfLines={1}>
                          {activeCategory?.name || "Choose"}
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-down" size={13} color="#64748B" />
                  </Pressable>

                  {/* Account Picker Tile */}
                  <Pressable
                    disabled={isAmountLocked}
                    onPress={() => {
                      setAccountPickerTarget("source");
                      setAccountSheetOpen(true);
                    }}
                    className={`flex-1 bg-botanical-pearl dark:bg-forest-deep p-3 rounded-2xl border border-botanical-border dark:border-forest-border flex-row items-center justify-between active:scale-98 ${
                      isAmountLocked ? "opacity-50" : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-2 flex-1 mr-1">
                      <Ionicons name="card-outline" size={16} color="#64748B" />
                      <View className="flex-1">
                        <Text className="text-[9px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark">
                          Account
                        </Text>
                        <Text className="text-xs font-bold text-ink dark:text-ink-light" numberOfLines={1}>
                          {sourceAccount?.name || "Account"}
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-down" size={13} color="#64748B" />
                  </Pressable>
                </View>
              )}

              {/* Row 2: Inline Note / Description Input */}
              <View className="mt-3 pt-3 border-t border-botanical-border dark:border-forest-border flex-row items-center gap-2">
                <Feather name="edit-2" size={13} color="#94A3B8" />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={
                    txType === "income"
                      ? "Note: e.g. Salary, Client payment, Bonus"
                      : txType === "transfer"
                      ? "Note: e.g. Savings deposit, Wallet top-up"
                      : "Note: e.g. Starbucks, Groceries, Dinner"
                  }
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-xs font-bold text-ink dark:text-ink-light py-1"
                />
                {description.length > 0 && (
                  <Pressable onPress={() => setDescription("")} hitSlop={6}>
                    <Feather name="x" size={12} color="#94A3B8" />
                  </Pressable>
                )}
              </View>

              {/* Row 3: Direct Micro-Chips (Date, Split, Tags) */}
              <View className="mt-3 pt-2.5 border-t border-botanical-border dark:border-forest-border flex-row items-center justify-between flex-wrap gap-1.5">
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  {/* Date Chip */}
                  <Pressable
                    onPress={() => setDateSheetOpen(true)}
                    className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl bg-botanical-pearl dark:bg-forest-deep border border-botanical-border dark:border-forest-border active:scale-95"
                  >
                    <Feather name="calendar" size={11} color="#64748B" />
                    <Text className="text-[11px] font-bold text-ink dark:text-ink-light capitalize">
                      {dateSelection === "custom" ? customDate.slice(0, 10) : dateSelection}
                    </Text>
                  </Pressable>

                  {/* Split Chip (Expense only) */}
                  {txType === "expense" && !isEditing && (
                    <Pressable
                      onPress={() => setSplitSheetOpen(true)}
                      className={`flex-row items-center gap-1 px-2.5 py-1 rounded-xl border active:scale-95 ${
                        selectedSplitGroup || selectedSplitPerson
                          ? "bg-lime/10 border-lime/30"
                          : "bg-botanical-pearl dark:bg-forest-deep border border-botanical-border dark:border-forest-border"
                      }`}
                    >
                      <Feather
                        name="users"
                        size={11}
                        color={selectedSplitGroup || selectedSplitPerson ? "#16A34A" : "#64748B"}
                      />
                      <Text
                        className={`text-[11px] font-bold ${
                          selectedSplitGroup || selectedSplitPerson
                            ? "text-emerald-700 dark:text-lime"
                            : "text-ink dark:text-ink-light"
                        }`}
                      >
                        {selectedSplitPerson
                          ? `Split: ${selectedSplitPerson}`
                          : selectedSplitGroup
                          ? `Split: ${selectedSplitGroup.name}`
                          : "Split"}
                      </Text>
                    </Pressable>
                  )}

                  {/* Tags Chip */}
                  <Pressable
                    onPress={() => setTagsSheetOpen(true)}
                    className={`flex-row items-center gap-1 px-2.5 py-1 rounded-xl border active:scale-95 ${
                      selectedTags.length > 0
                        ? "bg-forest dark:bg-lime border-forest dark:border-lime"
                        : "bg-botanical-pearl dark:bg-forest-deep border border-botanical-border dark:border-forest-border"
                    }`}
                  >
                    <Feather
                      name="hash"
                      size={11}
                      color={selectedTags.length > 0 ? "#FFFFFF" : "#64748B"}
                    />
                    <Text
                      className={`text-[11px] font-bold ${
                        selectedTags.length > 0
                          ? "text-white dark:text-forest"
                          : "text-ink dark:text-ink-light"
                      }`}
                    >
                      {selectedTags.length > 0 ? `${selectedTags.length} tags` : "Tag"}
                    </Text>
                  </Pressable>
                </View>

                {/* Split preview text indicator if any */}
                {splitPreviewText && (
                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-lime">
                    50/50 split active
                  </Text>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        </ScrollView>

        {/* ── 4. TACTILE NUMPAD & GUARANTEED UN-SQUASHED SUBMIT CTA ── */}
        <Animated.View
          entering={FadeInDown.duration(340).delay(110)}
          className="w-full px-5 pb-3 pt-1"
        >
          {!isAmountLocked && (
            <>
              {/* Compact Operator Strip */}
              <View className="flex-row gap-2 mb-2">
                {["+", "-", "×", "÷", "="].map((op) => (
                  <Pressable
                    key={op}
                    onPress={() => handleKey(op)}
                    className="flex-1 h-10 rounded-xl bg-botanical-pearl dark:bg-forest-surface border border-botanical-border dark:border-forest-border items-center justify-center active:scale-95 shadow-2xs"
                  >
                    <Text className="text-base font-black text-ink dark:text-ink-light">
                      {op}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 3x4 Proportional Tactile Numpad */}
              <View className="gap-2">
                {[
                  ["1", "2", "3"],
                  ["4", "5", "6"],
                  ["7", "8", "9"],
                ].map((row, rowIdx) => (
                  <View key={rowIdx} className="flex-row gap-2">
                    {row.map((num) => (
                      <Pressable
                        key={num}
                        onPress={() => handleKey(num)}
                        className="flex-1 h-14 rounded-2xl bg-white dark:bg-forest-surface border border-botanical-border dark:border-forest-border items-center justify-center shadow-2xs active:scale-95"
                      >
                        <Text className="text-2xl font-bold text-ink dark:text-ink-light">
                          {num}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ))}

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => handleKey(".")}
                    className="flex-1 h-14 rounded-2xl bg-white dark:bg-forest-surface border border-botanical-border dark:border-forest-border items-center justify-center shadow-2xs active:scale-95"
                  >
                    <Text className="text-2xl font-bold text-ink dark:text-ink-light">
                      .
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleKey("0")}
                    className="flex-1 h-14 rounded-2xl bg-white dark:bg-forest-surface border border-botanical-border dark:border-forest-border items-center justify-center shadow-2xs active:scale-95"
                  >
                    <Text className="text-2xl font-bold text-ink dark:text-ink-light">
                      0
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleKey("BACK")}
                    accessibilityRole="button"
                    accessibilityLabel="Backspace"
                    className="flex-1 h-14 rounded-2xl bg-white dark:bg-forest-surface border border-botanical-border dark:border-forest-border items-center justify-center shadow-2xs active:scale-95"
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={22}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {/* ── 5. MAIN ACTION BUTTON (EXPLICIT HEIGHT, NEVER SQUASHED) ── */}
          <View className="mt-3 shrink-0">
            <Pressable
              onPress={hasMathOperator ? () => handleKey("=") : handleSubmit}
              disabled={isPending || (isEditing && !editEligibility.canEdit)}
              className="w-full h-14 shrink-0 bg-primary rounded-2xl flex-row items-center justify-center gap-2 active:scale-98 shadow-sm border border-primary disabled:opacity-50"
            >
              <Feather
                name={hasMathOperator ? "check" : isEditing ? "save" : "plus"}
                size={18}
                color="#FFFFFF"
              />
              <Text className="text-sm font-black text-white tracking-wide">
                {isPending
                  ? "Saving..."
                  : hasMathOperator
                  ? `Calculate (${formatCurrency(
                      computedAmount,
                      activeCurrency,
                    )})`
                  : isEditing
                  ? "Update Transaction"
                  : txType === "income"
                  ? `Record Income • ${formatCurrency(
                      computedAmount,
                      activeCurrency,
                    )}`
                  : txType === "transfer"
                  ? `Transfer Funds • ${formatCurrency(
                      computedAmount,
                      activeCurrency,
                    )}`
                  : `Add Expense • ${formatCurrency(
                      computedAmount,
                      activeCurrency,
                    )}`}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── 6. BOTTOM PICKER SHEETS ── */}
        <CategorySheetModal
          visible={categorySheetOpen}
          categories={categories}
          activeCategoryId={activeCategory?.id}
          onSelect={(catId) => setSelectedCategoryId(catId)}
          onClose={() => setCategorySheetOpen(false)}
        />

        <AccountSheetModal
          visible={accountSheetOpen}
          txType={txType}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          sourceAccountId={sourceAccount?.id}
          selectedTransferAccountId={selectedTransferAccountId}
          selectionTarget={accountPickerTarget}
          onSelectSource={(id) => setSelectedAccountId(id)}
          onSelectTarget={(id) => setSelectedTransferAccountId(id)}
          onClose={() => setAccountSheetOpen(false)}
        />

        <DateSheetModal
          visible={dateSheetOpen}
          dateSelection={dateSelection}
          customDate={customDate}
          onSelectDateType={setDateSelection}
          onChangeCustomDate={setCustomDate}
          onClose={() => setDateSheetOpen(false)}
        />

        <TagsSheetModal
          visible={tagsSheetOpen}
          availableTags={allAvailableTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onAddCustomTag={addCustomTag}
          onClose={() => setTagsSheetOpen(false)}
        />

        <TransactionSplitSheet
          visible={splitSheetOpen}
          groups={groups}
          peopleSummaries={peopleSummaries}
          selectedSplitGroup={selectedSplitGroup}
          selectedSplitPerson={selectedSplitPerson}
          splitPaidBy={splitPaidBy}
          onChangePaidBy={setSplitPaidBy}
          onSelectGroup={setSelectedSplitGroup}
          onSelectPerson={setSelectedSplitPerson}
          onClose={() => setSplitSheetOpen(false)}
        />

        <ReceiptScannerModal
          visible={scannerModalOpen}
          onClose={() => setScannerModalOpen(false)}
          onApplyScannedData={applyScannedReceipt}
          currency={activeCurrency}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
