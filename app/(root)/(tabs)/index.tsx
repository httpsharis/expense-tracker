import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AccountSwitcherModal,
  HomeBalanceCard,
  HomeBudgetCard,
  HomeHeader,
  HomePushDownDrawer,
  HomeQuickDeck,
  HomeSpendingPulseCard,
  HomeSplitBentoCards,
  useHomeScreenData,
} from "@features/home";
import {
  DetailedTransactionItem,
  ReceiptScannerModal,
  TransactionDetailModal,
  TransactionRowItem,
} from "@features/transactions";
import { ErrorState } from "@shared/ui/ErrorState";
import { useReverseTransactionMutation } from "../../../store/hooks";
import { usePrompt } from "../../../store/promptStore";
import { useUserStore } from "../../../store/userStore";

type FeedItem =
  | { type: "date_header"; date: string }
  | { type: "transaction"; transaction: DetailedTransactionItem };

export default function HomeScreen() {
  const router = useRouter();
  const storeCurrency = useUserStore((s) => s.currency);
  const { confirm, alert } = usePrompt();
  const reverseTxMutation = useReverseTransactionMutation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<DetailedTransactionItem | null>(null);

  const {
    userName,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    activeBalance,
    totalBalance,
    activeCurrency,
    accountLabel,
    monthlyIncome,
    monthlyExpenses,
    monthlyNet,
    monthStartMode,
    totalBudget,
    remainingBudget,
    budgetProgressPercent,
    dailyAllowance,
    daysRemaining,
    cycleMonthName,
    selectedBudgetName,
    totalOwedToMe,
    totalIOwe,
    pendingOwedCount,
    pendingDebtors,
    categoryAllocations,
    feedTransactions,
    rawFeedTransactions,
    isLoading,
    isError,
    onRefresh,
    refreshing,
  } = useHomeScreenData();

  // ── Handle Append-Only Transaction Reversal / Deletion ──
  const handleReverseTx = useCallback(
    async (item: DetailedTransactionItem) => {
      setSelectedTx(null);
      const rawTx = rawFeedTransactions?.find((t) => t.id === item.id);
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
        await onRefresh();
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
    },
    [rawFeedTransactions, confirm, reverseTxMutation, onRefresh, alert],
  );

  // ── Group Feed Items Chronologically by Day (TODAY, YESTERDAY, 18 OCT) ──
  const groupedFeedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    let currentDate = "";

    for (const tx of feedTransactions) {
      const dateLabel = tx.dateStr.toUpperCase();
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        items.push({ type: "date_header", date: dateLabel });
      }
      items.push({ type: "transaction", transaction: tx });
    }

    return items;
  }, [feedTransactions]);

  const hasDebts = totalOwedToMe > 0 || totalIOwe > 0 || pendingOwedCount > 0;

  // ── Render FlatList Item (Clean, Instant, Native Performance) ──
  const renderItem = useCallback(
    ({ item }: { item: FeedItem; index: number }) => {
      if (item.type === "date_header") {
        return (
          <View className="px-6 pt-4 pb-1.5">
            <Text className="text-[11px] font-black uppercase tracking-wider text-ink-whisper dark:text-ink-whisper-dark">
              {item.date}
            </Text>
          </View>
        );
      }

      return (
        <View className="px-5 py-1">
          <TransactionRowItem
            item={item.transaction}
            onPress={setSelectedTx}
            onDelete={handleReverseTx}
          />
        </View>
      );
    },
    [handleReverseTx],
  );

  // ── Header Component for the Virtualized List ──
  const renderHeader = useMemo(
    () => (
      <View>
        {/* 1. Top Header Bar (Personalized Aesthetic Greeting + Feature Dropdown Toggle + Theme Toggle) */}
        <Animated.View
          entering={FadeInDown.duration(240)}
          layout={LinearTransition.duration(200)}
        >
          <HomeHeader
            isOpen={dropdownOpen}
            onOpenTray={() => setDropdownOpen((prev) => !prev)}
            userName={userName}
          />
        </Animated.View>

        {/* 2. Push-Down Quick Shortcuts Drawer (Smooth slide-down) */}
        {dropdownOpen && (
          <HomePushDownDrawer
            onClose={() => setDropdownOpen(false)}
            onNavigate={(route) => {
              setDropdownOpen(false);
              router.push(route as any);
            }}
          />
        )}

        {/* 3. Hero Balance Card (Airy, clean balance display) */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(30)}
          layout={LinearTransition.duration(200)}
        >
          <HomeBalanceCard
            accountLabel={accountLabel}
            onOpenAccountPicker={() => setAccountModalOpen(true)}
            isBalanceHidden={isBalanceHidden}
            onToggleBalanceHidden={() => setIsBalanceHidden((prev) => !prev)}
            activeBalance={activeBalance}
            activeCurrency={activeCurrency}
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
            daysRemaining={daysRemaining}
            monthStartMode={monthStartMode}
          />
        </Animated.View>

        {/* 3. Quick Action Deck (Dedicated space outside the balance card) */}
        <View>
          <HomeQuickDeck
            onIncome={() =>
              router.push({
                pathname: "/(root)/(tabs)/AddTransactions",
                params: { type: "income" },
              })
            }
            onExpense={() =>
              router.push({
                pathname: "/(root)/(tabs)/AddTransactions",
                params: { type: "expense" },
              })
            }
            onTransfer={() =>
              router.push({
                pathname: "/(root)/(tabs)/AddTransactions",
                params: { type: "transfer" },
              })
            }
            onSplit={() => router.push("/(root)/(tabs)/Splits")}
            onScan={() => setScannerModalOpen(true)}
          />
        </View>

        {/* 4. Casual Splits & Debts (Only if active obligations exist) */}
        {hasDebts && (
          <View>
            <HomeSplitBentoCards
              totalOwedToMe={totalOwedToMe}
              totalIOwe={totalIOwe}
              pendingOwedCount={pendingOwedCount}
              pendingDebtors={pendingDebtors}
              activeCurrency={activeCurrency}
              onOpenSplits={() => router.push("/(root)/(tabs)/Splits")}
              onSettleUp={() => router.push("/(root)/(tabs)/Splits")}
            />
          </View>
        )}

        {/* 5. Spending Pulse & Automated Diagnosis (Direct route to Analytics) */}
        <HomeSpendingPulseCard
          monthlyIncome={monthlyIncome}
          monthlyExpenses={monthlyExpenses}
          currency={activeCurrency}
          savingsRate={
            monthlyIncome > 0
              ? Math.max(0, Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100))
              : 0
          }
          topOverBudgetCategory={categoryAllocations.find((c) => c.percent > 100)?.name}
          overBudgetAmount={
            categoryAllocations.find((c) => c.percent > 100)
              ? Math.max(
                  0,
                  (categoryAllocations.find((c) => c.percent > 100)?.spent || 0) -
                    (categoryAllocations.find((c) => c.percent > 100)?.budget || 0),
                )
              : undefined
          }
          onOpenAnalytics={() => router.push("/(root)/(tabs)/Analytics")}
        />

        {/* 6. Selected Budget Card (Clean white surface with prominent category breakdown) */}
        <View>
          <HomeBudgetCard
            budgetName={selectedBudgetName}
            monthlyExpenses={monthlyExpenses}
            totalBudget={totalBudget}
            remainingBudget={remainingBudget}
            budgetProgressPercent={budgetProgressPercent}
            dailyAllowance={dailyAllowance}
            daysRemaining={daysRemaining}
            cycleMonthName={cycleMonthName}
            categoryAllocations={categoryAllocations}
            activeCurrency={activeCurrency}
            onOpenBudgets={() => router.push("/(root)/(tabs)/budgets")}
          />
        </View>

        {/* 6. Recent Activity Section Title + "See all" Link */}
        <Animated.View
          entering={FadeInDown.duration(340).delay(200)}
          className="flex-row items-center justify-between px-6 pt-5 pb-2"
        >
          <Text className="text-base font-black text-ink dark:text-ink-light tracking-tight">
            Recent Activity
          </Text>

          <Pressable
            onPress={() => router.push("/(root)/(tabs)/Transactions")}
            accessibilityRole="button"
            accessibilityLabel="View all transactions"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Text className="text-xs font-bold text-ink-muted dark:text-ink-muted-dark">
              See all
            </Text>
            <Feather name="chevron-right" size={13} color="#64748B" />
          </Pressable>
        </Animated.View>
      </View>
    ),
    [
      accountLabel,
      isBalanceHidden,
      activeBalance,
      activeCurrency,
      monthlyIncome,
      monthlyExpenses,
      daysRemaining,
      router,
      hasDebts,
      totalOwedToMe,
      totalIOwe,
      pendingOwedCount,
      pendingDebtors,
      selectedBudgetName,
      totalBudget,
      remainingBudget,
      budgetProgressPercent,
      dailyAllowance,
      cycleMonthName,
      categoryAllocations,
      dropdownOpen,
      userName,
    ],
  );

  // ── Empty / Error List States ──
  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator color="#22C55E" />
        </View>
      );
    }

    if (isError) {
      return (
        <View className="px-5 py-4">
          <ErrorState
            title="Could not load activity"
            message="Failed to load recent ledger transactions."
            onRetry={onRefresh}
          />
        </View>
      );
    }

    return (
      <View className="mx-5 my-3 py-10 rounded-3xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center">
        <Ionicons name="receipt-outline" size={28} color="#A0A0A3" />
        <Text className="text-sm font-bold text-ink dark:text-ink-light mt-2">
          No recent activity
        </Text>
        <Text className="text-xs text-ink-muted dark:text-ink-muted-dark mt-0.5">
          Tap 'Expense' or 'Income' to log your first transaction.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      {/* Primary Virtualized Lazy Scroll Container */}
      <FlatList
        data={groupedFeedItems}
        keyExtractor={(item, index) =>
          item.type === "date_header"
            ? `header-${item.date}-${index}`
            : `tx-${item.transaction.id}`
        }
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={<View className="h-28" />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#64748B"
          />
        }
      />


      {/* ── Transaction Audit & Detail Modal ── */}
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

      {/* ── Account Switcher Bottom Sheet ── */}
      <AccountSwitcherModal
        visible={accountModalOpen}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        totalBalance={totalBalance}
        baseCurrency={storeCurrency || "PKR"}
        onSelectAccount={(accId) => setSelectedAccountId(accId)}
        onClose={() => setAccountModalOpen(false)}
      />

      {/* ── Multimodal AI Receipt Scanner Modal ── */}
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
