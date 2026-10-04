import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
  TransactionDetailModal,
  TransactionRowItem,
} from "@features/home";
import { formatCurrency } from "@shared/lib/currency";
import {
  useAccountsWithBalancesQuery,
  useCategoriesQuery,
  useDeleteTransactionMutation,
  useTransactionsQuery,
} from "@store/hooks";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";

type FilterType = "all" | "expense" | "income" | "transfer";

export default function TransactionsScreen() {
  const router = useRouter();
  const storeCurrency = useUserStore((state) => state.currency);
  const { confirm, alert } = usePrompt();

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTx, setSelectedTx] = useState<DetailedTransactionItem | null>(null);

  // Queries & Mutations
  const { data: accounts = [] } = useAccountsWithBalancesQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const {
    data: liveTransactions = [],
    isLoading,
    refetch,
  } = useTransactionsQuery();
  const deleteTxMutation = useDeleteTransactionMutation();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Resolve transactions into unified DTOs
  const detailedTransactions: DetailedTransactionItem[] = useMemo(() => {
    if (!liveTransactions || liveTransactions.length === 0) return [];

    const today = new Date();
    const todayStr = today.toDateString();
    const yesterdayStr = new Date(today.getTime() - 86400000).toDateString();

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    return liveTransactions.map((tx) => {
      const dateObj = new Date(tx.date);
      const txDateStr = dateObj.toDateString();
      const isToday = txDateStr === todayStr;
      const isYesterday = txDateStr === yesterdayStr;

      const dateStr = isToday
        ? "Today"
        : isYesterday
          ? "Yesterday"
          : dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

      const cat = tx.category_id ? categoryMap.get(tx.category_id) : null;
      const catName =
        tx.category?.name ||
        cat?.name ||
        (tx.type === "income" ? "Income" : "General");
      const catIcon =
        tx.category?.icon || cat?.icon || (tx.type === "income" ? "💰" : "🏷️");
      const accName =
        (tx.account as any)?.name ||
        (tx.account_id ? accountMap.get(tx.account_id) : null) ||
        "Cash";

      return {
        id: tx.id,
        name: tx.description || catName,
        note:
          tx.description && tx.description !== catName ? tx.description : null,
        time: dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dateStr,
        amount:
          tx.type === "income"
            ? Math.abs(Number(tx.amount))
            : -Math.abs(Number(tx.amount)),
        type: tx.type as DetailedTransactionItem["type"],
        categoryName: catName,
        categoryIcon: catIcon,
        accountName: accName,
        currency: (tx.account as any)?.currency || storeCurrency || "PKR",
        inputMethod:
          (tx.input_method as DetailedTransactionItem["inputMethod"]) ||
          "manual",
        avatarBg:
          tx.type === "income"
            ? "#0F766E"
            : tx.type === "transfer"
              ? "#000000"
              : "#2563EB",
      };
    });
  }, [liveTransactions, categories, accounts, storeCurrency]);

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

      // 3. Search query
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
  }, [detailedTransactions, liveTransactions, activeFilter, selectedAccountId, searchQuery]);

  // Aggregate Metrics for Active Selection
  const { totalInflow, totalOutflow, netCashflow } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const item of filteredTransactions) {
      if (item.amount > 0) inflow += item.amount;
      else outflow += Math.abs(item.amount);
    }
    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      netCashflow: inflow - outflow,
    };
  }, [filteredTransactions]);

  // Section Grouping by Date
  const groupedSections = useMemo(() => {
    const groups: { [key: string]: DetailedTransactionItem[] } = {};
    for (const item of filteredTransactions) {
      const key = item.dateStr.toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filteredTransactions]);

  // Handle Delete Confirmation
  const handleDeleteTx = async (item: DetailedTransactionItem) => {
    setSelectedTx(null);
    const confirmed = await confirm({
      title: "Delete Transaction",
      message: `Are you sure you want to delete "${item.name}"? This will update your balances and ledger records.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await deleteTxMutation.mutateAsync(item.id);
    } catch (err: any) {
      await alert({
        title: "Action Failed",
        message: err.message || "Failed to delete transaction.",
        variant: "warning",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB]" edges={["top"]}>
      {/* 1. QUIET UTILITY TOP BAR */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-2">
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() => router.push("/(root)/(tabs)" as any)}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
            className="w-10 h-10 rounded-full bg-white border border-[#E4E7EC] items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="arrow-left" size={17} color="#090D16" />
          </Pressable>
          <View>
            <Text className="text-xl font-black text-[#090D16] tracking-tight">
              Ledger
            </Text>
            <Text className="text-[11px] font-semibold text-[#64748B]">
              {filteredTransactions.length}{" "}
              {filteredTransactions.length === 1 ? "record" : "records"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setShowSearch((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Search transactions"
            className={`w-10 h-10 rounded-full border items-center justify-center shadow-2xs active:scale-95 ${
              showSearch || searchQuery
                ? "bg-[#090D16] border-[#090D16]"
                : "bg-white border-[#E4E7EC]"
            }`}
          >
            <Feather
              name="search"
              size={16}
              color={showSearch || searchQuery ? "#FFFFFF" : "#090D16"}
            />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(root)/(tabs)/AddTransactions" as any)}
            accessibilityRole="button"
            accessibilityLabel="Add new transaction"
            className="h-10 px-3.5 rounded-full bg-[#D4F938] border border-[#D4F938] flex-row items-center gap-1.5 active:scale-95 shadow-2xs"
          >
            <Ionicons name="add" size={18} color="#090D16" />
            <Text className="text-xs font-black text-[#090D16]">New</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. EXPANDABLE SEARCH BAR */}
      {showSearch && (
        <View className="px-6 pt-1 pb-2">
          <View className="flex-row items-center bg-white border border-[#E4E7EC] rounded-2xl px-3.5 py-2.5 shadow-2xs">
            <Feather name="search" size={15} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search merchant, category, account..."
              placeholderTextColor="#94A3B8"
              className="flex-1 ml-2.5 text-xs font-medium text-[#090D16] py-0"
              autoFocus
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Feather name="x-circle" size={15} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {/* 3. NEO-BANKING CASHFLOW METRIC CARD (Matching Home Page) */}
      <View className="mx-6 mt-2 mb-3 bg-white rounded-3xl p-4 border border-[#E4E7EC] shadow-[0_4px_20px_rgba(9,13,22,0.04)]">
        <View className="flex-row items-center justify-between mb-2.5">
          <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
            {activeFilter === "all"
              ? "Cashflow Balance"
              : `${activeFilter} Total`}
          </Text>
          <View className="px-2.5 py-0.5 rounded-full bg-[#F4F5F7]">
            <Text className="text-[10px] font-bold text-[#090D16]">
              Net: {formatCurrency(netCashflow, storeCurrency, { showSign: true })}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Inflow Micro-Pill */}
          <View className="flex-1 flex-row items-center gap-2 py-2 px-3 rounded-2xl bg-emerald-50/80 border border-emerald-100">
            <View className="w-5 h-5 rounded-full bg-emerald-500/15 items-center justify-center">
              <Feather name="arrow-down-left" size={11} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-[8px] font-bold text-emerald-800/70 uppercase">
                Inflow
              </Text>
              <Text
                numberOfLines={1}
                className="text-xs font-black text-emerald-700 tabular-nums"
              >
                {formatCurrency(totalInflow, storeCurrency, {
                  showPositivePrefix: true,
                })}
              </Text>
            </View>
          </View>

          {/* Outflow Micro-Pill */}
          <View className="flex-1 flex-row items-center gap-2 py-2 px-3 rounded-2xl bg-rose-50/80 border border-rose-100">
            <View className="w-5 h-5 rounded-full bg-rose-500/15 items-center justify-center">
              <Feather name="arrow-up-right" size={11} color="#E11D48" />
            </View>
            <View className="flex-1">
              <Text className="text-[8px] font-bold text-rose-800/70 uppercase">
                Outflow
              </Text>
              <Text
                numberOfLines={1}
                className="text-xs font-black text-rose-700 tabular-nums"
              >
                {formatCurrency(-totalOutflow, storeCurrency, {
                  showSign: true,
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. TACTILE HORIZONTAL TYPE FILTER CHIPS */}
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
                className={`px-4 py-2 rounded-full border active:scale-95 shadow-2xs ${
                  isActive
                    ? "bg-[#D4F938] border-[#D4F938]"
                    : "bg-white border-[#E4E7EC]"
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    isActive ? "text-[#090D16]" : "text-[#64748B]"
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. ACCOUNT SECONDARY FILTER CHIPS */}
      {accounts.length > 1 && (
        <View className="mb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 6 }}
          >
            <Pressable
              onPress={() => setSelectedAccountId(null)}
              className={`px-3 py-1 rounded-full border ${
                selectedAccountId === null
                  ? "bg-[#090D16] border-[#090D16]"
                  : "bg-white border-[#E4E7EC]"
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  selectedAccountId === null ? "text-white" : "text-[#64748B]"
                }`}
              >
                All Accounts
              </Text>
            </Pressable>

            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() =>
                    setSelectedAccountId(isSelected ? null : acc.id)
                  }
                  className={`px-3 py-1 rounded-full border ${
                    isSelected
                      ? "bg-[#090D16] border-[#090D16]"
                      : "bg-white border-[#E4E7EC]"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isSelected ? "text-white" : "text-[#64748B]"
                    }`}
                  >
                    {acc.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 6. TRANSACTIONS SECTION FEED */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#090D16" />
          <Text className="text-xs font-semibold text-[#64748B] mt-3">
            Loading ledger...
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedSections}
          keyExtractor={(item) => item.title}
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
              tintColor="#090D16"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20 bg-white rounded-3xl p-6 border border-[#E4E7EC] mt-4 shadow-2xs">
              <View className="w-14 h-14 rounded-2xl bg-[#F8F9FB] border border-[#E4E7EC] items-center justify-center mb-3">
                <Ionicons name="receipt-outline" size={26} color="#94A3B8" />
              </View>
              <Text className="text-base font-black text-[#090D16]">
                No transactions found
              </Text>
              <Text className="text-xs text-[#64748B] text-center mt-1 max-w-[220px]">
                {searchQuery
                  ? `No matching records for "${searchQuery}"`
                  : "Start building your ledger by recording a payment or income."}
              </Text>

              <Pressable
                onPress={() =>
                  router.push("/(root)/(tabs)/AddTransactions" as any)
                }
                className="mt-4 px-5 py-2.5 rounded-full bg-[#D4F938] border border-[#D4F938] flex-row items-center gap-1.5 active:scale-95"
              >
                <Ionicons name="add" size={16} color="#090D16" />
                <Text className="text-xs font-black text-[#090D16]">
                  Record Transaction
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: section }) => (
            <View className="mb-5">
              {/* Section Header */}
              <View className="flex-row items-center justify-between mb-2 px-1">
                <Text className="text-[11px] font-extrabold text-[#94A3B8] tracking-wider uppercase">
                  {section.title}
                </Text>
                <Text className="text-[10px] font-semibold text-[#94A3B8]">
                  {section.data.length}{" "}
                  {section.data.length === 1 ? "item" : "items"}
                </Text>
              </View>

              {/* Transactions List */}
              <View className="gap-2.5">
                {section.data.map((tx) => (
                  <TransactionRowItem
                    key={tx.id}
                    item={tx}
                    onPress={setSelectedTx}
                  />
                ))}
              </View>
            </View>
          )}
        />
      )}

      {/* 7. UNIFIED TRANSACTION DETAIL MODAL */}
      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onDelete={handleDeleteTx}
      />
    </SafeAreaView>
  );
}
