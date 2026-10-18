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
} from "@features/transactions";

import { matchesBudgetFilter } from "@shared/lib/budgetCalculations";
import { mapTransactionToDetailedItem } from "@shared/lib/transactionMapper";
import { ErrorState } from "@shared/ui/ErrorState";
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
    isError,
    error,
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
    const today = new Date();
    const categoryMap = new Map(
      categories.map((c) => [c.id, { name: c.name, icon: c.icon }]),
    );
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    return matching.map((tx) =>
      mapTransactionToDetailedItem(
        tx,
        categoryMap,
        accountMap,
        "Cash",
        storeCurrency || "PKR",
        today,
      ),
    );
  }, [transactions, budget, activeDate, categories, accounts, storeCurrency]);

  const handleSaveBudget = async (payload: SaveBudgetPayload) => {
    try {
      await upsertBudget(payload);
      setEditModalVisible(false);
    } catch (err: unknown) {
      await alert({
        title: "Update Failed",
        message:
          err instanceof Error ? err.message : "Could not update budget.",
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
    } catch (err: unknown) {
      await alert({
        title: "Action Failed",
        message:
          err instanceof Error ? err.message : "Failed to remove budget.",
        variant: "warning",
      });
    }
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-canvas items-center justify-center">
        <ActivityIndicator size="large" color="#22C55E" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-canvas p-6 justify-center">
        <ErrorState
          title="Could not load budget"
          message={
            error instanceof Error ? error.message : "Failed to load budget."
          }
          onRetry={refetchAll}
        />
      </SafeAreaView>
    );
  }

  if (!budget) {
    return (
      <SafeAreaView className="flex-1 bg-canvas p-6 items-center justify-center">
        <Text className="text-base font-bold text-ink mb-2">
          Budget not found
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-primary px-5 py-2.5 rounded-full shadow-sm"
        >
          <Text className="text-xs font-bold text-white">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* 1. Header Bar */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-surface border-b border-surface-border">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95 shadow-2xs"
        >
          <Feather name="arrow-left" size={18} color="#71717A" />
        </Pressable>

        <View className="items-center">
          <Text className="text-base font-black text-ink tracking-tight">
            {budget.name}
          </Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-primary" />
            <Text className="text-[10px] font-bold text-ink-muted">
              {budget.periodLabel}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setEditModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit budget"
            className="w-9 h-9 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="edit-2" size={14} color="#71717A" />
          </Pressable>
          <Pressable
            onPress={handleDeleteBudget}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Delete budget"
            className="w-9 h-9 rounded-full bg-rose-500/10 border border-rose-500/20 items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="trash-2" size={14} color="#EF4444" />
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
            tintColor="#22C55E"
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
                <Text className="text-xs font-black text-ink uppercase tracking-wider">
                  Matching Transactions
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-surface-muted border border-surface-border">
                  <Text className="text-[10px] font-bold text-ink">
                    {detailedTransactions.length}
                  </Text>
                </View>
              </View>

              <Text className="text-[11px] font-semibold text-ink-muted">
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
          <View className="p-8 items-center justify-center bg-surface rounded-3xl mx-5 border border-dashed border-surface-border shadow-2xs">
            <View className="w-12 h-12 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center mb-3">
              <Feather name="inbox" size={20} color="#71717A" />
            </View>
            <Text className="text-sm font-black text-ink mb-1">
              No matching activity
            </Text>
            <Text className="text-xs text-ink-muted text-center max-w-[240px] leading-relaxed">
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
