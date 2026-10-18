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
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BudgetBigCard,
  BudgetCard,
  BudgetFormModal,
  type BudgetWithDerived,
  type SaveBudgetPayload,
  useBudgetsData,
} from "@features/budgets";

import { PRIMARY, themes } from "@shared/theme/tokens";
import { ErrorState } from "@shared/ui/ErrorState";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";
import { useColorScheme } from "nativewind";

export default function BudgetsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? themes.dark : themes.light;
  const storeCurrency = useUserStore((state) => state.currency);
  const { confirm, alert } = usePrompt();

  const {
    budgets,
    categories,
    accounts,
    isLoading,
    isError,
    error,
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
    } catch (err: unknown) {
      await alert({
        title: "Action Failed",
        message:
          err instanceof Error ? err.message : "Failed to remove budget.",
        variant: "warning",
      });
    }
  };

  const topBudget = budgets[0];
  const remainingBudgets = budgets.slice(1);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* 1. Header Bar with Title & "+" / "New Budget" Affordance */}
      <Animated.View
        entering={FadeInDown.duration(260)}
        className="flex-row items-center justify-between px-5 pt-3 pb-3 border-b border-surface-border bg-surface"
      >
        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(root)/(tabs)")
            }
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
          >
            <Feather name="arrow-left" size={17} color={palette.textPrimary} />
          </Pressable>
          <View>
            <Text className="text-xl font-black text-ink tracking-tight">
              Budgets
            </Text>
            <Text className="text-[11px] font-medium text-ink-muted mt-0.5">
              Spending limits & live ledger pacing
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleOpenAddModal}
          accessibilityRole="button"
          accessibilityLabel="Create New Budget"
          className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary active:scale-95 shadow-sm"
        >
          <Feather name="plus" size={15} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">New Budget</Text>
        </Pressable>
      </Animated.View>

      {/* 2. Scrollable Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetchAll}
            tintColor={PRIMARY}
          />
        }
      >
        {isLoading && !refreshing ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : isError ? (
          <View className="px-5 pt-6">
            <ErrorState
              title="Could not load budgets"
              message={
                error instanceof Error
                  ? error.message
                  : "Failed to load budgets."
              }
              onRetry={refetchAll}
            />
          </View>
        ) : budgets.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(340).delay(60)}
            className="px-5 pt-12"
          >
            <View className="bg-surface rounded-3xl p-8 items-center border border-surface-border">
              <View className="w-14 h-14 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center mb-4">
                <Text className="text-3xl">🎯</Text>
              </View>
              <Text className="text-base font-black text-ink">
                No budgets set yet
              </Text>
              <Text className="text-xs text-ink-muted text-center mt-1.5 mb-5 max-w-[260px] leading-relaxed">
                Create a budget for all spending, or filter by category or
                account. Transactions count automatically.
              </Text>
              <Pressable
                onPress={handleOpenAddModal}
                accessibilityRole="button"
                className="bg-primary px-5 py-3 rounded-full active:scale-95 shadow-sm flex-row items-center gap-1.5"
              >
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">
                  Create your first budget
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View className="px-5 pt-4">
            {/* Top of the screen: Big Featured Budget Card for deep tracking */}
            {topBudget && (
              <Animated.View
                entering={FadeInDown.duration(340).delay(50)}
                layout={LinearTransition.springify().damping(20).stiffness(180)}
                className="mb-2"
              >
                <BudgetBigCard
                  item={topBudget}
                  currency={storeCurrency}
                  onPress={() =>
                    router.push({
                      pathname: "/(root)/budgets/[id]",
                      params: { id: topBudget.id },
                    })
                  }
                  onEdit={() => handleOpenEditModal(topBudget)}
                />
              </Animated.View>
            )}

            {/* Below that top card: Each additional budget, stacked vertically */}
            {remainingBudgets.length > 0 && (
              <View className="mt-2">
                <Animated.View
                  entering={FadeInDown.duration(300).delay(110)}
                  className="flex-row items-center justify-between mb-2.5 px-1"
                >
                  <Text className="text-xs font-black text-ink-muted uppercase tracking-wider">
                    Other Budgets ({remainingBudgets.length})
                  </Text>
                </Animated.View>
                {remainingBudgets.map((item, idx) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.duration(320).delay(140 + idx * 45)}
                    layout={LinearTransition.springify()
                      .damping(20)
                      .stiffness(180)}
                  >
                    <BudgetCard
                      item={item}
                      currency={storeCurrency}
                      onPress={() =>
                        router.push({
                          pathname: "/(root)/budgets/[id]",
                          params: { id: item.id },
                        })
                      }
                      onEdit={() => handleOpenEditModal(item)}
                    />
                  </Animated.View>
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
