import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DetailedTransactionItem,
  ReceiptScannerModal,
  TransactionDetailModal,
  TransactionRowItem,
} from "@features/transactions";
import { DEFAULT_CATEGORIES } from "@services/categories";
import { CategoryIcon } from "@shared/components/CategoryIcon";
import { formatCurrency } from "@shared/lib/currency";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { mapTransactionToDetailedItem } from "@shared/lib/transactionMapper";
import { CORAL, EMERALD, PRIMARY } from "@shared/theme/tokens";
import { ErrorState } from "@shared/ui/ErrorState";
import {
  useAccountsWithBalancesQuery,
  useCategoriesQuery,
  useReverseTransactionMutation,
  useTransactionsQuery,
} from "@store/hooks";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";

type FilterType = "all" | "expense" | "income" | "transfer";
type DateRangeFilter = "all" | "this_month" | "last_month" | "last_7_days";

type ListItem =
  | { type: "header"; title: string; count: number }
  | { type: "item"; transaction: DetailedTransactionItem };

export default function TransactionsScreen() {
  const router = useRouter();
  const storeCurrency = useUserStore((state) => state.currency) || "PKR";
  const { confirm, alert } = usePrompt();

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const selectedAccountId = useUserStore((state) => state.activeFilterAccountId);
  const setSelectedAccountId = useUserStore((state) => state.setActiveFilterAccountId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTx, setSelectedTx] = useState<DetailedTransactionItem | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);

  // Data Queries
  const {
    data: accounts = [],
    isError: isAccountsError,
    error: accountsError,
    refetch: refetchAccounts,
  } = useAccountsWithBalancesQuery();
  const { data: rawCategories = [] } = useCategoriesQuery();
  const {
    data: liveTransactions = [],
    isLoading,
    isError: isTxError,
    error: txError,
    refetch,
  } = useTransactionsQuery({ limit: 300 });
  const reverseTxMutation = useReverseTransactionMutation();

  const categories = useMemo(() => {
    if (rawCategories.length > 0) return rawCategories;
    return DEFAULT_CATEGORIES.map((cat, idx) => ({
      id: `default-${idx + 1}`,
      name: cat.name,
      icon: cat.icon,
      is_default: true,
      user_id: "",
      created_at: "",
      updated_at: "",
    }));
  }, [rawCategories]);

  const isError = isTxError || isAccountsError;
  const error = txError ?? accountsError;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchAccounts()]);
    setRefreshing(false);
  };

  // Resolve transactions into unified DTOs
  const detailedTransactions: DetailedTransactionItem[] = useMemo(() => {
    if (!liveTransactions || liveTransactions.length === 0) return [];
    const today = new Date();
    const categoryMap = new Map(
      categories.map((c) => [c.id, { name: c.name, icon: c.icon }]),
    );
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    return liveTransactions.map((tx) =>
      mapTransactionToDetailedItem(
        tx,
        categoryMap,
        accountMap,
        "Cash",
        storeCurrency,
        today,
        true,
      ),
    );
  }, [liveTransactions, categories, accounts, storeCurrency]);

  // Date Range Bounds
  const dateBounds = useMemo(() => {
    const now = new Date();
    if (dateRange === "this_month") {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime(),
      };
    }
    if (dateRange === "last_month") {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime(),
      };
    }
    if (dateRange === "last_7_days") {
      return {
        start: now.getTime() - 7 * 86_400_000,
        end: now.getTime(),
      };
    }
    return null;
  }, [dateRange]);

  // Apply Multi-Filter & Search Pipeline
  const filteredTransactions = useMemo(() => {
    return detailedTransactions.filter((item) => {
      // 1. Type filter
      if (activeFilter !== "all" && item.type !== activeFilter) return false;

      // 2. Account filter
      if (selectedAccountId) {
        const rawTx = liveTransactions.find((t) => t.id === item.id);
        if (rawTx && rawTx.account_id !== selectedAccountId) return false;
      }

      // 3. Category filter
      if (selectedCategoryId) {
        const rawTx = liveTransactions.find((t) => t.id === item.id);
        if (rawTx && rawTx.category_id !== selectedCategoryId) return false;
      }

      // 4. Date Range filter
      if (dateBounds) {
        const rawTx = liveTransactions.find((t) => t.id === item.id);
        if (rawTx) {
          const txTime = new Date(rawTx.date).getTime();
          if (txTime < dateBounds.start || txTime > dateBounds.end) return false;
        }
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCategory = item.categoryName.toLowerCase().includes(query);
        const matchAccount = item.accountName.toLowerCase().includes(query);
        const matchNote = item.note?.toLowerCase().includes(query) ?? false;
        return matchName || matchCategory || matchAccount || matchNote;
      }

      return true;
    });
  }, [
    detailedTransactions,
    liveTransactions,
    activeFilter,
    selectedAccountId,
    selectedCategoryId,
    dateBounds,
    searchQuery,
  ]);

  const activeCurrency = useMemo(() => {
    if (selectedAccountId) {
      return (
        accounts.find((acc) => acc.id === selectedAccountId)?.currency ||
        storeCurrency
      );
    }
    return storeCurrency;
  }, [selectedAccountId, accounts, storeCurrency]);

  // Aggregate Metrics for Active Selection
  const { totalInflow, totalOutflow, netCashflow, avgSpend } = useMemo(() => {
    let inflowMinor = 0;
    let outflowMinor = 0;
    let outflowCount = 0;

    for (const item of filteredTransactions) {
      if (item.status !== "completed" || item.type === "transfer") continue;
      if (!selectedAccountId && item.currency !== activeCurrency) continue;
      const amountMinor = Math.abs(toMinorUnits(item.amount));
      if (item.amount > 0) {
        inflowMinor += amountMinor;
      } else {
        outflowMinor += amountMinor;
        outflowCount++;
      }
    }

    const inflow = fromMinorUnits(inflowMinor);
    const outflow = fromMinorUnits(outflowMinor);
    const avg = outflowCount > 0 ? Math.round((outflow / outflowCount) * 100) / 100 : 0;

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netCashflow: fromMinorUnits(inflowMinor - outflowMinor),
      avgSpend: avg,
    };
  }, [filteredTransactions, selectedAccountId, activeCurrency]);

  // Section Grouping by Date (Flattened for maximum list performance)
  const flattenedListItems = useMemo<ListItem[]>(() => {
    const groups: { [key: string]: DetailedTransactionItem[] } = {};
    for (const item of filteredTransactions) {
      const key = item.dateStr.toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    const items: ListItem[] = [];
    for (const [title, txs] of Object.entries(groups)) {
      items.push({ type: "header", title, count: txs.length });
      for (const tx of txs) {
        items.push({ type: "item", transaction: tx });
      }
    }
    return items;
  }, [filteredTransactions]);

  // Handle Append-Only Double-Entry Reversal
  const handleReverseTx = async (item: DetailedTransactionItem) => {
    setSelectedTx(null);
    const rawTx = liveTransactions.find((t) => t.id === item.id);
    if (!rawTx) return;

    const confirmed = await confirm({
      title: "Post Reversal Entry",
      message: `Posting a reversal for "${item.name}" will create an offsetting counter-entry, restore your account balance, and preserve full audit history. Proceed?`,
      variant: "warning",
      confirmText: "Post Reversal",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await reverseTxMutation.mutateAsync({ transaction: rawTx });
    } catch (err: unknown) {
      await alert({
        title: "Reversal Failed",
        message:
          err instanceof Error
            ? err.message
            : "Failed to post reversal entry.",
        variant: "warning",
      });
    }
  };

  const hasActiveFilters =
    activeFilter !== "all" ||
    selectedAccountId !== null ||
    selectedCategoryId !== null ||
    dateRange !== "all" ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setActiveFilter("all");
    setSelectedAccountId(null);
    setSelectedCategoryId(null);
    setDateRange("all");
    setSearchQuery("");
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      {/* 1. TOP HEADER & ACTION CLUSTER */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-2 bg-transparent">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(root)/(tabs)")
            }
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="arrow-left" size={17} color="#64748B" />
          </Pressable>
          <View>
            <Text className="text-xl font-black text-ink dark:text-ink-light tracking-tight">
              Ledger
            </Text>
            <Text className="text-[11px] font-semibold text-ink-whisper dark:text-ink-whisper-dark">
              {filteredTransactions.length}{" "}
              {filteredTransactions.length === 1 ? "record" : "records"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Search Toggle */}
          <Pressable
            onPress={() => setShowSearch((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Search transactions"
            className={`w-10 h-10 rounded-full border items-center justify-center active:scale-95 shadow-2xs ${
              showSearch || searchQuery
                ? "bg-primary/15 border-primary/40"
                : "bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-border-dark"
            }`}
          >
            <Feather
              name="search"
              size={16}
              color={showSearch || searchQuery ? PRIMARY : "#64748B"}
            />
          </Pressable>

          {/* Camera Receipt Scanner Shortcut */}
          <Pressable
            onPress={() => setScannerModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Scan receipt with camera"
            className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="camera" size={16} color="#22C55E" />
          </Pressable>

          {/* Add Transaction Button */}
          <Pressable
            onPress={() => router.push("/(root)/(tabs)/AddTransactions")}
            accessibilityRole="button"
            accessibilityLabel="Add new transaction"
            className="h-10 px-4 rounded-full bg-primary flex-row items-center gap-1.5 active:scale-95 shadow-2xs"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-xs font-black text-white">New</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. EXPANDABLE SEARCH BAR */}
      {showSearch && (
        <View className="px-6 pt-1 pb-2">
          <View className="flex-row items-center bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark rounded-2xl px-3.5 py-2.5">
            <Feather name="search" size={15} color="#A0A0A3" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search merchant, category, account, note..."
              placeholderTextColor="#A0A0A3"
              className="flex-1 ml-2.5 text-xs font-medium text-ink dark:text-ink-light py-0"
              autoFocus
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Feather name="x-circle" size={15} color="#A0A0A3" />
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {/* 3. CASHFLOW & PERIOD METRICS BANNER */}
      <View className="mx-6 mt-2 mb-3 bg-surface dark:bg-surface-dark rounded-3xl p-4 border border-surface-border dark:border-surface-border-dark shadow-2xs">
        <View className="flex-row items-center justify-between mb-2.5">
          <Text className="text-[10px] font-bold text-ink-muted dark:text-ink-muted-dark uppercase tracking-wider">
            {activeFilter === "all"
              ? "Net Period Balance"
              : `${activeFilter} Total`}
          </Text>
          <View className="px-2.5 py-0.5 rounded-full bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark">
            <Text className="text-[10px] font-bold text-ink dark:text-ink-light tabular-nums">
              Net: {formatCurrency(netCashflow, activeCurrency, { showSign: true })}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Inflow Micro-Pill */}
          <View className="flex-1 flex-row items-center gap-2 py-2 px-3 rounded-2xl bg-emerald-dim border border-emerald/25">
            <View className="w-5 h-5 rounded-full bg-emerald/15 items-center justify-center">
              <Feather name="arrow-down-left" size={11} color={EMERALD} />
            </View>
            <View className="flex-1">
              <Text className="text-[8px] font-bold text-ink-muted dark:text-ink-muted-dark uppercase">
                Inflow
              </Text>
              <Text
                numberOfLines={1}
                className="text-xs font-black text-emerald tabular-nums"
              >
                {formatCurrency(totalInflow, activeCurrency, {
                  showPositivePrefix: true,
                })}
              </Text>
            </View>
          </View>

          {/* Outflow Micro-Pill */}
          <View className="flex-1 flex-row items-center gap-2 py-2 px-3 rounded-2xl bg-coral-dim border border-coral/25">
            <View className="w-5 h-5 rounded-full bg-coral/15 items-center justify-center">
              <Feather name="arrow-up-right" size={11} color={CORAL} />
            </View>
            <View className="flex-1">
              <Text className="text-[8px] font-bold text-ink-muted dark:text-ink-muted-dark uppercase">
                Outflow
              </Text>
              <Text
                numberOfLines={1}
                className="text-xs font-black text-coral tabular-nums"
              >
                {formatCurrency(-totalOutflow, activeCurrency, {
                  showSign: true,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Reset Indicator */}
        {hasActiveFilters && (
          <View className="mt-2.5 pt-2 border-t border-surface-divider dark:border-surface-border-dark flex-row items-center justify-between">
            <Text className="text-[10px] text-ink-whisper dark:text-ink-whisper-dark">
              Filters active ({filteredTransactions.length} results)
            </Text>
            <Pressable
              onPress={handleResetFilters}
              className="flex-row items-center gap-1 active:opacity-75"
            >
              <Feather name="rotate-ccw" size={11} color="#22C55E" />
              <Text className="text-[10px] font-black text-primary">
                Reset All Filters
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 4. TYPE FILTER CHIPS (All, Expense, Income, Transfer) */}
      <View className="mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {(["all", "expense", "income", "transfer"] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full border active:scale-95 shadow-2xs ${
                  isActive
                    ? "bg-primary border-primary"
                    : "bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-border-dark"
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    isActive
                      ? "text-white"
                      : "text-ink-muted dark:text-ink-muted-dark"
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}

          {/* Time Range Horizon Chips */}
          {(
            [
              { key: "all", label: "All Time" },
              { key: "this_month", label: "This Month" },
              { key: "last_7_days", label: "7 Days" },
              { key: "last_month", label: "Last Month" },
            ] as const
          ).map((item) => {
            const isSelected = dateRange === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setDateRange(item.key)}
                className={`px-3 py-1.5 rounded-full border active:scale-95 ${
                  isSelected
                    ? "bg-ink dark:bg-ink-light border-ink dark:border-ink-light"
                    : "bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-border-dark"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected
                      ? "text-canvas dark:text-canvas-dark font-black"
                      : "text-ink-muted dark:text-ink-muted-dark"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. CATEGORY FILTER CHIPS */}
      <View className="mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 6 }}
        >
          <Pressable
            onPress={() => setSelectedCategoryId(null)}
            className={`px-3 py-1 rounded-full border active:scale-95 ${
              selectedCategoryId === null
                ? "bg-surface-muted dark:bg-surface-muted-dark border-primary"
                : "bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-border-dark"
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                selectedCategoryId === null
                  ? "text-primary font-black"
                  : "text-ink-muted dark:text-ink-muted-dark"
              }`}
            >
              All Categories
            </Text>
          </Pressable>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() =>
                  setSelectedCategoryId(isSelected ? null : cat.id)
                }
                className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full border active:scale-95 ${
                  isSelected
                    ? "bg-surface-muted dark:bg-surface-muted-dark border-primary"
                    : "bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-border-dark"
                }`}
              >
                <CategoryIcon
                  icon={cat.icon}
                  size={11}
                  color={isSelected ? "#22C55E" : "#A0A0A3"}
                />
                <Text
                  className={`text-[10px] font-bold ${
                    isSelected
                      ? "text-primary font-black"
                      : "text-ink-muted dark:text-ink-muted-dark"
                  }`}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 6. TRANSACTIONS SECTION FEED */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text className="text-xs font-semibold text-ink-muted dark:text-ink-muted-dark mt-3">
            Loading ledger records...
          </Text>
        </View>
      ) : isError ? (
        <View className="px-6 pt-6">
          <ErrorState
            title="Could not load ledger"
            message={
              error instanceof Error
                ? error.message
                : "Failed to load transactions."
            }
            onRetry={onRefresh}
          />
        </View>
      ) : (
        <FlatList
          data={flattenedListItems}
          keyExtractor={(item, index) =>
            item.type === "header"
              ? `header-${item.title}-${index}`
              : `tx-${item.transaction.id}`
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 120,
            paddingTop: 4,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16 bg-surface dark:bg-surface-dark rounded-3xl p-6 border border-surface-border dark:border-surface-border-dark mt-4 shadow-2xs">
              <View className="w-14 h-14 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark items-center justify-center mb-3">
                <Ionicons
                  name="receipt-outline"
                  size={26}
                  color="#A0A0A3"
                />
              </View>
              <Text className="text-base font-black text-ink dark:text-ink-light">
                No transactions found
              </Text>
              <Text className="text-xs text-ink-muted dark:text-ink-muted-dark text-center mt-1 max-w-[240px]">
                {hasActiveFilters
                  ? "No transactions match your current search and filter criteria."
                  : "Start recording your expenses, income, and transfers."}
              </Text>

              {hasActiveFilters ? (
                <Pressable
                  onPress={handleResetFilters}
                  className="mt-4 px-5 py-2.5 rounded-full bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark flex-row items-center gap-1.5 active:scale-95"
                >
                  <Feather name="rotate-ccw" size={14} color="#22C55E" />
                  <Text className="text-xs font-black text-primary">
                    Clear Filters
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push("/(root)/(tabs)/AddTransactions")}
                  className="mt-4 px-5 py-2.5 rounded-full bg-primary flex-row items-center gap-1.5 active:scale-95"
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text className="text-xs font-black text-white">
                    Record Transaction
                  </Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View className="flex-row items-center justify-between pt-4 pb-2 px-1">
                  <Text className="text-[11px] font-black text-ink-whisper dark:text-ink-whisper-dark tracking-wider uppercase">
                    {item.title}
                  </Text>
                  <Text className="text-[10px] font-semibold text-ink-whisper dark:text-ink-whisper-dark">
                    {item.count} {item.count === 1 ? "item" : "items"}
                  </Text>
                </View>
              );
            }

            return (
              <View className="py-1">
                <TransactionRowItem
                  item={item.transaction}
                  onPress={setSelectedTx}
                  onDelete={handleReverseTx}
                />
              </View>
            );
          }}
        />
      )}

      {/* 7. UNIFIED TRANSACTION DETAIL MODAL */}
      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onReverse={handleReverseTx}
        onEdit={(item) => {
          setSelectedTx(null);
          router.push({
            pathname: "/(root)/(tabs)/AddTransactions",
            params: { editId: item.id },
          });
        }}
      />

      {/* 8. MULTIMODAL RECEIPT SCANNER MODAL */}
      <ReceiptScannerModal
        visible={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        currency={activeCurrency}
        onApplyScannedData={(data) => {
          setScannerModalOpen(false);
          router.push({
            pathname: "/(root)/(tabs)/AddTransactions",
            params: {
              initialType: "expense",
              initialAmount: String(data.amount),
              initialDescription: data.merchant,
              initialCategory: data.category,
            },
          });
        }}
      />
    </SafeAreaView>
  );
}
