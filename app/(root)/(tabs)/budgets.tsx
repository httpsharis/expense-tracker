import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    BudgetBigCard,
    BudgetCard,
    BudgetFormModal,
    type BudgetWithDerived,
    type SaveBudgetPayload,
    useBudgetsData,
} from "@features/budgets";

import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";

export default function BudgetsScreen() {
  const router = useRouter();
  const storeCurrency = useUserStore((state) => state.currency);
  const { confirm, alert } = usePrompt();

  const {
    budgets,
    categories,
    accounts,
    isLoading,
    refreshing,
    refetchAll,
    upsertBudget,
    deleteBudget,
    isSaving,
  } = useBudgetsData();

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingBudget, setEditingBudget] = useState<BudgetWithDerived | null>(
    null,
  );

  const handleOpenAddModal = () => {
    setModalMode("create");
    setEditingBudget(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: BudgetWithDerived) => {
    setModalMode("edit");
    setEditingBudget(item);
    setModalVisible(true);
  };

  const handleSaveBudget = async (payload: SaveBudgetPayload) => {
    await upsertBudget(payload);
    setModalVisible(false);
  };

  const handleDeleteBudget = async (budgetId: string) => {
    setModalVisible(false);

    const confirmed = await confirm({
      title: "Delete Budget?",
      message:
        "This will remove this budget. Your recorded transactions will remain untouched.",
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await deleteBudget(budgetId);
    } catch (err: any) {
      await alert({
        title: "Action Failed",
        message: err?.message || "Failed to remove budget.",
        variant: "warning",
      });
    }
  };

  const topBudget = budgets[0];
  const remainingBudgets = budgets.slice(1);

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB]" edges={["top"]}>
      {/* 1. Header Bar with Title & "+" / "New Budget" Affordance */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3 border-b border-[#E4E7EC] bg-white">
        <View>
          <Text className="text-xl font-black text-[#090D16] tracking-tight">
            Budgets
          </Text>
          <Text className="text-[11px] font-medium text-[#64748B] mt-0.5">
            Spending limits & live ledger pacing
          </Text>
        </View>

        <Pressable
          onPress={handleOpenAddModal}
          accessibilityRole="button"
          accessibilityLabel="Create New Budget"
          className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#090D16] active:scale-97 shadow-sm border border-[#232838]"
        >
          <Feather name="plus" size={14} color="#D4F938" />
          <Text className="text-xs font-bold text-white">New Budget</Text>
        </Pressable>
      </View>

      {/* 2. Scrollable Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetchAll}
            tintColor="#090D16"
          />
        }
      >
        {isLoading && !refreshing ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color="#090D16" />
          </View>
        ) : budgets.length === 0 ? (
          <View className="px-5 pt-12">
            <View className="bg-white rounded-3xl p-8 items-center border border-[#E4E7EC] shadow-[0_4px_20px_-4px_rgba(9,13,22,0.06)]">
              <View className="w-14 h-14 rounded-2xl bg-[#F4F5F7] border border-[#E4E7EC] items-center justify-center mb-4">
                <Text className="text-3xl">🎯</Text>
              </View>
              <Text className="text-base font-black text-[#090D16]">
                No budgets set yet
              </Text>
              <Text className="text-xs text-[#64748B] text-center mt-1.5 mb-5 max-w-[260px] leading-relaxed">
                Create a budget for all spending, or filter by category or
                account. Transactions count automatically.
              </Text>
              <Pressable
                onPress={handleOpenAddModal}
                accessibilityRole="button"
                className="bg-[#090D16] px-5 py-2.5 rounded-full active:scale-97 shadow-sm border border-[#232838] flex-row items-center gap-1.5"
              >
                <Feather name="plus" size={14} color="#D4F938" />
                <Text className="text-xs font-bold text-white">
                  Create your first budget
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="px-5 pt-4">
            {/* Top of the screen: Big Featured Budget Card for deep tracking */}
            {topBudget && (
              <View className="mb-2">
                <BudgetBigCard
                  item={topBudget}
                  currency={storeCurrency}
                  onPress={() =>
                    router.push({
                      pathname: "/(root)/budgets/[id]" as any,
                      params: { id: topBudget.id },
                    })
                  }
                  onEdit={() => handleOpenEditModal(topBudget)}
                />
              </View>
            )}

            {/* Below that top card: Each additional budget, stacked vertically */}
            {remainingBudgets.length > 0 && (
              <View className="mt-2">
                <View className="flex-row items-center justify-between mb-2.5 px-1">
                  <Text className="text-xs font-black text-[#090D16] uppercase tracking-wider">
                    Other Budgets ({remainingBudgets.length})
                  </Text>
                </View>
                {remainingBudgets.map((item) => (
                  <BudgetCard
                    key={item.id}
                    item={item}
                    currency={storeCurrency}
                    onPress={() =>
                      router.push({
                        pathname: "/(root)/budgets/[id]" as any,
                        params: { id: item.id },
                      })
                    }
                    onEdit={() => handleOpenEditModal(item)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 3. Budget Form Modal */}
      <BudgetFormModal
        visible={modalVisible}
        mode={modalMode}
        categories={categories}
        accounts={accounts}
        initialBudget={
          editingBudget
            ? {
                id: editingBudget.id,
                name: editingBudget.name,
                amount: editingBudget.amount,
                period_type: editingBudget.period_type,
                category_id: editingBudget.category_id,
                account_id: editingBudget.account_id,
                period_start: editingBudget.period_start,
                period_end: editingBudget.period_end,
              }
            : undefined
        }
        currency={storeCurrency}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveBudget}
        onDelete={handleDeleteBudget}
        isSaving={isSaving}
      />
    </SafeAreaView>
  );
}
