import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatCurrency } from "@shared/lib/currency";
import {
    useCategoriesQuery,
    useDeleteTransactionMutation,
    useTransactionsQuery,
} from "@store/hooks";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";

type FilterType = "all" | "income" | "expense" | "transfer";

interface FormattedTransaction {
  id: string;
  name: string;
  time: string;
  dateKey: string;
  rawDate: Date;
  amount: number;
  type: "income" | "expense" | "transfer";
  categoryLabel: string;
  initials: string;
  avatarBg: string;
  currency: string;
}

export default function TransactionsScreen() {
  const router = useRouter();

  // State
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTx, setSelectedTx] = useState<FormattedTransaction | null>(
    null,
  );

  // User Store & Categories
  const storeCurrency = useUserStore((state) => state.currency);
  const { confirm, alert } = usePrompt();
  const { data: categories = [] } = useCategoriesQuery();

  // Queries & Mutations
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

  // Category map for resilient lookups
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  // Grouping & Filtering
  const formattedTransactions: FormattedTransaction[] = useMemo(() => {
    if (!liveTransactions || liveTransactions.length === 0) {
      return [];
    }

    const today = new Date();
    const todayStr = today.toDateString();
    const yesterdayStr = new Date(today.getTime() - 86400000).toDateString();

    const sourceList = liveTransactions.map((tx) => {
      const dateObj = new Date(tx.date);
      const txDateStr = dateObj.toDateString();
      const isToday = txDateStr === todayStr;
      const isYesterday = txDateStr === yesterdayStr;

      const dateKey = isToday
        ? "TODAY"
        : isYesterday
          ? "YESTERDAY"
          : dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

      const catName =
        (tx.category as any)?.name ||
        (tx.category_id ? categoryMap.get(tx.category_id) : null);

      const name = tx.description || catName || "Transaction";
      const initials = name.slice(0, 2).toUpperCase();
      const avatarBg =
        tx.type === "income"
          ? "#0F766E"
          : tx.type === "transfer"
            ? "#000000"
            : "#2563EB";

      return {
        id: tx.id,
        name,
        time: new Date(tx.date).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dateKey,
        rawDate: new Date(tx.date),
        amount: tx.type === "income" ? tx.amount : -tx.amount,
        type: tx.type as any,
        categoryLabel:
          tx.type === "income"
            ? "Receive"
            : tx.type === "transfer"
              ? "Transfer"
              : (catName ?? "Payment"),
        initials,
        avatarBg,
        currency: (tx as any).currency || storeCurrency || "PKR",
      };
    });

    return sourceList.filter((item) => {
      // Filter by type
      if (activeFilter !== "all" && item.type !== activeFilter) {
        return false;
      }
      // Filter by search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(query) ||
          item.categoryLabel.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [liveTransactions, activeFilter, searchQuery, categoryMap, storeCurrency]);

  // Group items by dateKey for sectioned display
  const groupedSections = useMemo(() => {
    const groups: { [key: string]: FormattedTransaction[] } = {};
    for (const item of formattedTransactions) {
      if (!groups[item.dateKey]) {
        groups[item.dateKey] = [];
      }
      groups[item.dateKey].push(item);
    }
    return Object.entries(groups).map(([title, data]) => ({
      title,
      data,
    }));
  }, [formattedTransactions]);

  // Handle delete
  const handleDeleteTx = async (item: FormattedTransaction) => {
    setSelectedTx(null);
    const confirmed = await confirm({
      title: "Delete Transaction",
      message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
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
      {/* 1. Header Bar */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
        <Pressable
          onPress={() => router.push("/(root)/(tabs)" as any)}
          className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center shadow-xs active:scale-95"
        >
          <Feather name="arrow-left" size={18} color="#0F172A" />
        </Pressable>

        <Text className="text-base font-bold text-[#0F172A] tracking-tight">
          Transaction History
        </Text>

        <Pressable
          onPress={() => setShowSearch((prev) => !prev)}
          className={`w-10 h-10 rounded-full border items-center justify-center shadow-xs active:scale-95 ${
            showSearch
              ? "bg-[#0F172A] border-[#0F172A]"
              : "bg-white border-gray-100"
          }`}
        >
          <Feather
            name="search"
            size={18}
            color={showSearch ? "#FFFFFF" : "#0F172A"}
          />
        </Pressable>
      </View>

      {/* 2. Collapsible Search Bar */}
      {showSearch && (
        <View className="px-6 py-2">
          <View className="flex-row items-center bg-white border border-gray-200/80 rounded-2xl px-3.5 py-2">
            <Feather name="search" size={16} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by merchant, note, or type..."
              placeholderTextColor="#94A3B8"
              className="flex-1 ml-2.5 text-sm font-medium text-[#0F172A] py-0"
              autoFocus
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Feather name="x-circle" size={16} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {/* 3. Horizontal Pill Filters (All, Income, Expense, Transfer) */}
      <View className="px-6 py-2">
        <View className="flex-row items-center gap-2">
          {(["all", "income", "expense", "transfer"] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full border active:scale-95 ${
                  isActive
                    ? "bg-[#D4F938] border-[#D4F938]"
                    : "bg-white border-gray-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    isActive ? "text-[#0F172A]" : "text-[#64748B]"
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 4. Date-Grouped Transaction List */}
      <FlatList
        data={groupedSections}
        keyExtractor={(item) => item.title}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 110,
          paddingTop: 10,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0F172A"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="w-16 h-16 rounded-full bg-white items-center justify-center border border-gray-100 mb-3 shadow-xs">
              <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
            </View>
            <Text className="text-base font-bold text-[#0F172A]">
              No transactions found
            </Text>
            <Text className="text-xs text-[#94A3B8] text-center mt-1 max-w-[220px]">
              {searchQuery
                ? `No transactions matching "${searchQuery}"`
                : "Record transactions by tapping the '+' or 'Send' button."}
            </Text>
          </View>
        }
        renderItem={({ item: section }) => (
          <View className="mb-6">
            {/* Section Header */}
            <Text className="text-[10px] font-extrabold text-[#94A3B8] tracking-wider uppercase mb-2 px-1">
              {section.title}
            </Text>

            {/* Section Card */}
            <View className="bg-white rounded-3xl p-3 border border-gray-100 shadow-xs">
              {section.data.map((tx, idx) => {
                const isLast = idx === section.data.length - 1;
                const isPositive = tx.amount > 0;

                return (
                  <Pressable
                    key={tx.id}
                    onPress={() => setSelectedTx(tx)}
                    className={`flex-row items-center justify-between py-3 px-2 active:bg-gray-50 rounded-2xl ${
                      !isLast ? "border-b border-gray-100" : ""
                    }`}
                  >
                    {/* Left: Avatar & Name */}
                    <View className="flex-row items-center gap-3.5 flex-1 mr-3">
                      <View
                        style={{ backgroundColor: tx.avatarBg }}
                        className="w-11 h-11 rounded-full items-center justify-center"
                      >
                        <Text className="text-xs font-bold text-white">
                          {tx.initials}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-sm font-bold text-[#0F172A] tracking-tight"
                        >
                          {tx.name}
                        </Text>
                        <Text className="text-xs text-[#94A3B8] mt-0.5">
                          {tx.time}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Amount & Category */}
                    <View className="items-end">
                      <Text
                        className={`text-sm font-extrabold tracking-tight tabular-nums ${
                          isPositive ? "text-emerald-600" : "text-[#0F172A]"
                        }`}
                      >
                        {formatCurrency(tx.amount, tx.currency, {
                          showPositivePrefix: true,
                        })}
                      </Text>
                      <Text className="text-xs font-medium text-[#94A3B8] mt-0.5">
                        {tx.categoryLabel}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      {/* Transaction Details Modal */}
      <Modal
        visible={Boolean(selectedTx)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <Pressable
          onPress={() => setSelectedTx(null)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 pb-10"
          >
            {selectedTx && (
              <>
                <View className="items-center pb-4 border-b border-gray-100">
                  <View
                    style={{ backgroundColor: selectedTx.avatarBg }}
                    className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  >
                    <Text className="text-xl font-bold text-white">
                      {selectedTx.initials}
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-[#0F172A]">
                    {selectedTx.name}
                  </Text>
                  <Text className="text-2xl font-extrabold text-[#0F172A] mt-1 tabular-nums">
                    {formatCurrency(selectedTx.amount, selectedTx.currency, {
                      showPositivePrefix: true,
                    })}
                  </Text>
                </View>

                <View className="py-4 gap-3">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-[#64748B]">Type</Text>
                    <Text className="text-xs font-bold text-[#0F172A] capitalize">
                      {selectedTx.type}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-[#64748B]">Category</Text>
                    <Text className="text-xs font-bold text-[#0F172A]">
                      {selectedTx.categoryLabel}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-[#64748B]">Time</Text>
                    <Text className="text-xs font-bold text-[#0F172A]">
                      {selectedTx.dateKey}, {selectedTx.time}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-3 mt-4">
                  <Pressable
                    onPress={() => handleDeleteTx(selectedTx)}
                    className="flex-1 h-12 rounded-2xl bg-red-50 border border-red-200 items-center justify-center active:opacity-75"
                  >
                    <Text className="text-xs font-bold text-red-600">
                      Delete Transaction
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedTx(null)}
                    className="flex-1 h-12 rounded-2xl bg-[#0F172A] items-center justify-center active:opacity-75"
                  >
                    <Text className="text-xs font-bold text-white">Done</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
