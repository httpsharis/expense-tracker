import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BudgetBigCard,
  BudgetFormModal,
  type SaveBudgetPayload,
  useBudgetsData,
} from "@features/budgets";
import {
  type DetailedTransactionItem,
  TransactionDetailModal,
  TransactionRowItem,
} from "@features/home";

import { matchesBudgetFilter } from "@shared/lib/budgetCalculations";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";

export default function BudgetDetailScreen() {
  const router = useRouter();
  const { id: budgetId } = useLocalSearchParams<{ id: string }>();
  const storeCurrency = useUserStore((state) => state.currency);
  const { confirm, alert } = usePrompt();

  const {
    activeDate,
    budgets,
    categories,
    accounts,
    transactions,
    isLoading,
    refreshing,
    refetchAll,
    upsertBudget,
    deleteBudget,
    isSaving,
  } = useBudgetsData();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<DetailedTransactionItem | null>(null);

  // Find targeted budget with derived metrics
  const budget = useMemo(() => {
    return budgets.find((b) => b.id === budgetId);
  }, [budgets, budgetId]);

  // Matching transactions for the current period mapped to DetailedTransactionItem
  const detailedTransactions: DetailedTransactionItem[] = useMemo(() => {
    if (!budget) return [];
    const matching = transactions.filter((tx) =>
      matchesBudgetFilter(tx, budget, activeDate),
    );

    return matching.map((tx) => {
      const cat = categories.find((c) => c.id === tx.category_id);
      const acc = accounts.find((a) => a.id === tx.account_id);
      const txDate = new Date(tx.date);
      const dateStr = txDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const time = txDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        id: tx.id,
        name: tx.description || cat?.name || "Expense",
        note: (tx as any).notes || tx.description || null,
        time,
        dateStr,
        amount: -Math.abs(Number(tx.amount)),
        type: "expense" as const,
        categoryName: cat?.name || "Uncategorized",
        categoryIcon: cat?.icon || "🏷️",
        accountName: acc?.name || "Cash",
        currency: storeCurrency || "PKR",
        inputMethod: (tx.input_method as any) || "manual",
        avatarBg: "#F4F5F7",
      };
    });
  }, [transactions, budget, activeDate, categories, accounts, storeCurrency]);

  const handleSaveBudget = async (payload: SaveBudgetPayload) => {
    try {
      await upsertBudget(payload);
      setEditModalVisible(false);
    } catch (err: any) {
      await alert({
        title: "Update Failed",
        message: err?.message || "Could not update budget.",
        variant: "warning",
      });
    }
  };

  const handleDeleteBudget = async () => {
    if (!budget?.id) return;

    const confirmed = await confirm({
      title: "Delete Budget?",
      message: `Are you sure you want to delete "${budget.name}"? Transactions will remain untouched.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await deleteBudget(budget.id);
      router.back();
    } catch (err: any) {
      await alert({
        title: "Action Failed",
        message: err?.message || "Failed to remove budget.",
        variant: "warning",
      });
    }
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F9FB] items-center justify-center">
        <ActivityIndicator size="large" color="#090D16" />
      </SafeAreaView>
    );
  }

  if (!budget) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F9FB] p-6 items-center justify-center">
        <Text className="text-base font-bold text-[#090D16] mb-2">
          Budget not found
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-[#090D16] px-5 py-2.5 rounded-full"
        >
          <Text className="text-xs font-bold text-white">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB]" edges={["top"]}>
      {/* 1. Header Bar */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-[#E4E7EC]">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 rounded-full bg-white border border-[#E4E7EC] items-center justify-center active:scale-95 shadow-2xs"
        >
          <Feather name="arrow-left" size={18} color="#090D16" />
        </Pressable>

        <View className="items-center">
          <Text className="text-base font-black text-[#090D16] tracking-tight">
            {budget.name}
          </Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <Text className="text-[10px] font-bold text-[#64748B]">
              {budget.periodLabel}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setEditModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit budget"
            className="w-9 h-9 rounded-full bg-[#F4F5F7] border border-[#E4E7EC] items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="edit-2" size={14} color="#090D16" />
          </Pressable>
          <Pressable
            onPress={handleDeleteBudget}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Delete budget"
            className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="trash-2" size={14} color="#E11D48" />
          </Pressable>
        </View>
      </View>

      {/* 2. Transactions List with Budget Summary Header */}
      <FlatList
        data={detailedTransactions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetchAll}
            tintColor="#090D16"
          />
        }
        ListHeaderComponent={
          <View className="p-5 pb-3">
            {/* Budget Summary Big Card with live tracking */}
            <BudgetBigCard
              item={budget}
              currency={storeCurrency}
              onPress={() => setEditModalVisible(true)}
              onEdit={() => setEditModalVisible(true)}
            />

            {/* Matching Ledger Transactions Section Header */}
            <View className="flex-row items-center justify-between mt-4 mb-2.5 px-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs font-black text-[#090D16] uppercase tracking-wider">
                  Matching Transactions
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-[#F4F5F7] border border-[#E4E7EC]">
                  <Text className="text-[10px] font-bold text-[#090D16]">
                    {detailedTransactions.length}
                  </Text>
                </View>
              </View>

              <Text className="text-[11px] font-semibold text-[#64748B]">
                {budget.periodLabel}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-5 mb-2.5">
            <TransactionRowItem item={item} onPress={setSelectedTx} />
          </View>
        )}
        ListEmptyComponent={
          <View className="p-8 items-center justify-center bg-white rounded-3xl mx-5 border border-dashed border-[#E4E7EC] shadow-2xs">
            <View className="w-12 h-12 rounded-2xl bg-[#F4F5F7] items-center justify-center mb-3">
              <Feather name="inbox" size={20} color="#94A3B8" />
            </View>
            <Text className="text-sm font-black text-[#090D16] mb-1">
              No matching activity
            </Text>
            <Text className="text-xs text-[#64748B] text-center max-w-[240px] leading-relaxed">
              Expenses matching this budget's filter during{" "}
              {budget.periodLabel.toLowerCase()} will appear here automatically.
            </Text>
          </View>
        }
      />

      {/* 3. Edit Modal */}
      <BudgetFormModal
        visible={editModalVisible}
        mode="edit"
        categories={categories}
        accounts={accounts}
        initialBudget={{
          id: budget.id,
          name: budget.name,
          amount: budget.amount,
          period_type: budget.period_type,
          category_id: budget.category_id,
          account_id: budget.account_id,
          period_start: budget.period_start,
          period_end: budget.period_end,
        }}
        currency={storeCurrency}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveBudget}
        onDelete={handleDeleteBudget}
        isSaving={isSaving}
      />

      {/* 4. Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </SafeAreaView>
  );
}
