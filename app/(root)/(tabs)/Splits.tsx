import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CreateGroupModal,
  FriendDetailModal,
  GroupDetailModal,
  GroupItemCard,
  ObligationHeroCard,
  PeopleManagerModal,
  PersonDebtCard,
  SettleModal,
  SettlementHistoryCard,
  SplitBillModal,
  SplitItemRow,
  useSplitsData,
} from "@features/splits";
import type {
  GroupWithMembers,
  PersonDebtSummary,
  SettlementHistoryItem,
  SplitDetailItem,
} from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { PRIMARY } from "@shared/theme/tokens";
import { ErrorState } from "@shared/ui/ErrorState";
import { Surface } from "@shared/ui/Surface";
import { Text } from "@shared/ui/Text";
import { useUserStore } from "@store/userStore";

type DirectionFilter = "all" | "owed_to_me" | "i_owe";
type StatusFilter = "all" | "unsettled" | "partial" | "settled";
type SettlementFilter = "all" | "received" | "paid";
type ViewMode = "people" | "groups" | "all_items" | "settlements";

export default function SplitsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams<{ action?: string }>();
  const currency = useUserStore((s) => s.currency) || "PKR";
  const {
    groups,
    splits,
    peopleSummaries,
    summary,
    settlements,
    settlementSummary,
    isLoading,
    isError,
    error,
    refreshing,
    refetchAll,
    createGroup,
    isCreatingGroup,
    settleSplit,
    isSettlingSplit,
    renamePerson,
    deletePerson,
  } = useSplitsData();

  const [viewMode, setViewMode] = useState<ViewMode>("people");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [settlementFilter, setSettlementFilter] =
    useState<SettlementFilter>("all");

  // Filtered settlements based on type (all vs received vs paid)
  const filteredSettlements = useMemo(() => {
    if (settlementFilter === "all") return settlements;
    return settlements.filter((s) => s.type === settlementFilter);
  }, [settlements, settlementFilter]);

  // Modals state
  const [splitBillModalOpen, setSplitBillModalOpen] = useState(false);
  const [splitBillFriendName, setSplitBillFriendName] = useState<string | null>(null);
  const [selectedFriendForDetail, setSelectedFriendForDetail] =
    useState<PersonDebtSummary | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [peopleManagerOpen, setPeopleManagerOpen] = useState(false);
  const [selectedGroupForDetail, setSelectedGroupForDetail] =
    useState<GroupWithMembers | null>(null);
  const [selectedSplitToSettle, setSelectedSplitToSettle] =
    useState<SplitDetailItem | null>(null);

  // If navigated from outside with action=split, trigger split modal
  useEffect(() => {
    if (params.action === "split") {
      setSplitBillModalOpen(true);
    }
  }, [params.action]);

  const existingFriendNames = useMemo(
    () => peopleSummaries.map((p) => p.person_name),
    [peopleSummaries]
  );

  // Separate people into 3 distinct financial buckets for instant clarity
  const { owedToMePeople, iOwePeople, settledPeople } = useMemo(() => {
    const owed: PersonDebtSummary[] = [];
    const owe: PersonDebtSummary[] = [];
    const settled: PersonDebtSummary[] = [];

    for (const p of peopleSummaries) {
      if (p.net_balance > 0) {
        owed.push(p);
      } else if (p.net_balance < 0) {
        owe.push(p);
      } else {
        settled.push(p);
      }
    }

    return {
      owedToMePeople: owed,
      iOwePeople: owe,
      settledPeople: settled,
    };
  }, [peopleSummaries]);

  // Status counts for automated filtering
  const statusCounts = useMemo(() => {
    let openCount = 0;
    let partialCount = 0;
    let settledCount = 0;

    for (const s of splits) {
      if (s.status === "settled") {
        settledCount++;
      } else if (s.status === "partial" || ((s.paid_amount ?? 0) > 0)) {
        partialCount++;
      } else {
        openCount++;
      }
    }

    return {
      all: splits.length,
      unsettled: openCount,
      partial: partialCount,
      settled: settledCount,
    };
  }, [splits]);

  // Filtered raw splits based on direction + status
  const filteredSplits = useMemo(() => {
    return splits.filter((s) => {
      // Direction match
      if (directionFilter !== "all" && s.direction !== directionFilter) {
        return false;
      }

      // Status match
      if (statusFilter === "unsettled") {
        return s.status !== "settled" && (s.paid_amount ?? 0) === 0;
      }
      if (statusFilter === "partial") {
        return s.status === "partial" || ((s.paid_amount ?? 0) > 0 && s.status !== "settled");
      }
      if (statusFilter === "settled") {
        return s.status === "settled";
      }

      return true;
    });
  }, [splits, directionFilter, statusFilter]);

  const handleOpenSplitBill = (friendName?: string) => {
    setSplitBillFriendName(friendName || null);
    setSplitBillModalOpen(true);
  };

  const handleSettleConfirm = async (
    splitId: string,
    amount: number,
    accountId?: string | null,
    settlementMode?: "account_impact" | "off_ledger"
  ) => {
    await settleSplit({ splitId, amount, accountId, settlementMode });
    setSelectedSplitToSettle(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* 1. Clean Top Header */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3 bg-canvas">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(root)/(tabs)")
            }
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="w-10 h-10 rounded-full bg-surface border border-surface-border items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="arrow-left" size={16} color={isDark ? "#F4F4F5" : "#18181B"} />
          </Pressable>
          <View>
            <Text className="text-xl font-black text-ink tracking-tight">
              Split Expenses
            </Text>
            <Text className="text-xs font-medium text-ink-muted">
              Shared tabs & bills with friends
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Contacts Directory */}
          <Pressable
            onPress={() => setPeopleManagerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Manage directory"
            className="w-10 h-10 rounded-full bg-surface border border-surface-border items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="users" size={16} color={isDark ? "#F4F4F5" : "#18181B"} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetchAll}
            tintColor={PRIMARY}
          />
        }
      >
        {/* 2. Simple Universal Split Deck with Primary Action Button */}
        <ObligationHeroCard
          summary={summary}
          currency={currency}
          hasOverdue={peopleSummaries.some((p) => p.has_overdue)}
          onSplitPress={() => handleOpenSplitBill()}
          onGroupPress={() => setCreateModalOpen(true)}
        />

        {/* 3. Sleek Segmented Switcher */}
        <View className="mx-6 mb-4 p-1 rounded-2xl bg-surface-muted border border-surface-border flex-row">
          {(
            [
              { id: "people", label: `Friends (${peopleSummaries.length})` },
              { id: "groups", label: `Groups (${groups.length})` },
              { id: "all_items", label: `Tabs (${splits.length})` },
              { id: "settlements", label: `History (${settlements.length})` },
            ] as const
          ).map((tab) => {
            const isActive = viewMode === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setViewMode(tab.id)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                className={`flex-1 py-2 rounded-xl items-center active:scale-98 ${
                  isActive ? "bg-surface shadow-2xs" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    isActive ? "text-ink" : "text-ink-muted"
                  }`}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isError ? (
          <View className="px-6">
            <ErrorState
              title="Could not load splits"
              message={
                error instanceof Error
                  ? error.message
                  : "Failed to load shared tabs."
              }
              onRetry={refetchAll}
            />
          </View>
        ) : (
          <>
            {/* ── Segment A: Friends View (Individual Friend Account Cards) ── */}
            {viewMode === "people" && (
              <View className="px-6">
                {isLoading ? (
                  <ActivityIndicator className="my-6" color={PRIMARY} />
                ) : peopleSummaries.length === 0 ? (
                  <Surface
                    variant="flat"
                    className="p-6 rounded-2xl items-center border border-surface-border bg-surface"
                  >
                    <Text className="text-xs font-medium text-ink-muted text-center">
                      No friend tabs yet. Tap "+ Split a Bill" above to add your first shared expense.
                    </Text>
                  </Surface>
                ) : (
                  <>
                    {/* 1. Friends Who Owe You */}
                    {owedToMePeople.length > 0 && (
                      <View className="mb-4">
                        <View className="flex-row items-center gap-1.5 mb-2 px-1">
                          <Feather name="arrow-down-left" size={13} color="#22C55E" />
                          <Text className="text-[11px] font-black uppercase tracking-wider text-primary">
                            Friends Who Owe You ({owedToMePeople.length})
                          </Text>
                        </View>
                        {owedToMePeople.map((person) => (
                          <PersonDebtCard
                            key={person.person_name}
                            person={person}
                            currency={currency}
                            onSettleItem={setSelectedSplitToSettle}
                            onAddBill={(name) => handleOpenSplitBill(name)}
                            onViewDetails={(p) => setSelectedFriendForDetail(p)}
                          />
                        ))}
                      </View>
                    )}

                    {/* 2. Friends You Owe */}
                    {iOwePeople.length > 0 && (
                      <View className="mb-4">
                        <View className="flex-row items-center gap-1.5 mb-2 px-1">
                          <Feather name="arrow-up-right" size={13} color="#EF4444" />
                          <Text className="text-[11px] font-black uppercase tracking-wider text-rose-500">
                            Friends You Owe ({iOwePeople.length})
                          </Text>
                        </View>
                        {iOwePeople.map((person) => (
                          <PersonDebtCard
                            key={person.person_name}
                            person={person}
                            currency={currency}
                            onSettleItem={setSelectedSplitToSettle}
                            onAddBill={(name) => handleOpenSplitBill(name)}
                            onViewDetails={(p) => setSelectedFriendForDetail(p)}
                          />
                        ))}
                      </View>
                    )}

                    {/* 3. Settled Friends */}
                    {settledPeople.length > 0 && (
                      <View className="mb-4">
                        <View className="flex-row items-center gap-1.5 mb-2 px-1">
                          <Feather name="check-circle" size={12} color="#A1A1AA" />
                          <Text className="text-[11px] font-black uppercase tracking-wider text-ink-whisper">
                            All Settled Up ({settledPeople.length})
                          </Text>
                        </View>
                        {settledPeople.map((person) => (
                          <PersonDebtCard
                            key={person.person_name}
                            person={person}
                            currency={currency}
                            onSettleItem={setSelectedSplitToSettle}
                            onAddBill={(name) => handleOpenSplitBill(name)}
                            onViewDetails={(p) => setSelectedFriendForDetail(p)}
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* ── Segment B: Groups View ── */}
            {viewMode === "groups" && (
              <View className="px-6">
                <View className="flex-row items-center justify-between mb-3 px-1">
                  <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase">
                    Active Groups ({groups.length})
                  </Text>
                  <Pressable
                    onPress={() => setCreateModalOpen(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-surface-border active:scale-95"
                  >
                    <Feather name="plus" size={12} color="#22C55E" />
                    <Text className="text-[11px] font-bold text-ink">New Group</Text>
                  </Pressable>
                </View>

                {groups.length === 0 ? (
                  <Surface
                    variant="flat"
                    className="p-6 rounded-2xl items-center border border-surface-border bg-surface"
                  >
                    <Text className="text-xs font-medium text-ink-muted text-center">
                      No groups yet. Tap "+ New Group" to track expenses for trips or flatmates.
                    </Text>
                  </Surface>
                ) : (
                  <View className="gap-2.5">
                    {groups.map((group) => (
                      <GroupItemCard
                        key={group.id}
                        group={group}
                        onPress={() => setSelectedGroupForDetail(group)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Segment C: Chronological Activity Feed ── */}
            {viewMode === "all_items" && (
              <View className="px-6">
                {/* 1. Status Filter Chips */}
                <View className="mb-2.5">
                  <Text className="text-[10px] font-bold text-ink-whisper tracking-wider uppercase mb-1.5 px-1">
                    Filter by Status
                  </Text>
                  <View className="flex-row gap-1.5">
                    {(
                      [
                        { id: "all", label: `All (${statusCounts.all})` },
                        { id: "unsettled", label: `Open (${statusCounts.unsettled})` },
                        { id: "partial", label: `Partial (${statusCounts.partial})` },
                        { id: "settled", label: `Settled (${statusCounts.settled})` },
                      ] as const
                    ).map((chip) => {
                      const isActive = statusFilter === chip.id;
                      return (
                        <Pressable
                          key={chip.id}
                          onPress={() => setStatusFilter(chip.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          className={`px-3 py-1.5 rounded-xl border active:scale-95 ${
                            isActive
                              ? "bg-ink dark:bg-ink-light border-transparent shadow-xs"
                              : "bg-surface border-surface-border"
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isActive ? "text-surface dark:text-surface" : "text-ink-muted"
                            }`}
                          >
                            {chip.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 2. Direction Filter Chips */}
                <View className="flex-row gap-1.5 mb-3.5">
                  {(
                    [
                      { id: "all", label: "All Directions" },
                      { id: "owed_to_me", label: "Owed to You" },
                      { id: "i_owe", label: "You Owe" },
                    ] as const
                  ).map((tab) => {
                    const isActive = directionFilter === tab.id;
                    return (
                      <Pressable
                        key={tab.id}
                        onPress={() => setDirectionFilter(tab.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        className={`px-3 py-1 rounded-full border active:scale-95 ${
                          isActive
                            ? "bg-primary border-primary"
                            : "bg-surface border-surface-border"
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            isActive ? "text-white" : "text-ink-muted"
                          }`}
                        >
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {isLoading ? (
                  <ActivityIndicator className="my-6" color={PRIMARY} />
                ) : filteredSplits.length === 0 ? (
                  <Surface
                    variant="flat"
                    className="p-6 rounded-2xl items-center border border-surface-border bg-surface"
                  >
                    <Text className="text-xs font-medium text-ink-muted">
                      No split bills found matching this filter.
                    </Text>
                  </Surface>
                ) : (
                  <View className="gap-2">
                    {filteredSplits.map((split) => (
                      <SplitItemRow
                        key={split.id}
                        split={split}
                        currency={currency}
                        onSettlePress={setSelectedSplitToSettle}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Segment D: Settlement Payment History ── */}
            {viewMode === "settlements" && (
              <View className="px-6">
                {/* 1. Universal Settlement Metric Deck: "Money I Got" vs "Money I Settled" */}
                <View className="mb-4 p-5 rounded-3xl bg-surface border border-surface-border shadow-xs">
                  <View className="flex-row items-center justify-between mb-3.5">
                    <View>
                      <Text className="text-[11px] font-bold text-ink-whisper uppercase tracking-wider">
                        Settlement Cashflow
                      </Text>
                      <Text className="text-xs text-ink-muted mt-0.5">
                        Track money collected and debts paid
                      </Text>
                    </View>
                    <View className="px-2.5 py-1 rounded-full bg-surface-muted border border-surface-border">
                      <Text className="text-[10px] font-bold text-ink">
                        {settlementSummary.totalCount} Payments
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    {/* Left: Money Got (Received) */}
                    <View className="flex-1 p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <Feather name="arrow-down-left" size={14} color="#22C55E" />
                        <Text className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          Money Got
                        </Text>
                      </View>
                      <Text className="text-lg font-black text-primary tabular-nums tracking-tight">
                        +{formatCurrency(settlementSummary.totalReceived, currency)}
                      </Text>
                      <Text className="text-[10px] font-medium text-ink-muted mt-0.5">
                        {settlementSummary.receivedCount} collected
                      </Text>
                    </View>

                    {/* Right: Money Settled (Paid Out) */}
                    <View className="flex-1 p-3.5 rounded-2xl bg-surface-muted border border-surface-border">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <Feather name="arrow-up-right" size={14} color="#71717A" />
                        <Text className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                          Money Settled
                        </Text>
                      </View>
                      <Text className="text-lg font-black text-ink tabular-nums tracking-tight">
                        -{formatCurrency(settlementSummary.totalPaid, currency)}
                      </Text>
                      <Text className="text-[10px] font-medium text-ink-muted mt-0.5">
                        {settlementSummary.paidCount} paid off
                      </Text>
                    </View>
                  </View>

                  {/* Net Cashflow Strip */}
                  <View className="mt-3.5 pt-3 border-t border-surface-border flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-ink-muted">
                      Net Settled Position
                    </Text>
                    <Text
                      className={`text-xs font-black tabular-nums ${
                        settlementSummary.netSettled >= 0
                          ? "text-primary"
                          : "text-ink"
                      }`}
                    >
                      {settlementSummary.netSettled >= 0 ? "+" : ""}
                      {formatCurrency(settlementSummary.netSettled, currency)}
                    </Text>
                  </View>
                </View>

                {/* 2. Interactive Filter Chips */}
                <View className="flex-row gap-2 mb-3.5">
                  {(
                    [
                      { id: "all", label: `All (${settlementSummary.totalCount})` },
                      {
                        id: "received",
                        label: `Money Got (+${settlementSummary.receivedCount})`,
                      },
                      {
                        id: "paid",
                        label: `Settled (-${settlementSummary.paidCount})`,
                      },
                    ] as const
                  ).map((chip) => {
                    const isActive = settlementFilter === chip.id;
                    return (
                      <Pressable
                        key={chip.id}
                        onPress={() => setSettlementFilter(chip.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        className={`px-3 py-1.5 rounded-xl border active:scale-95 ${
                          isActive
                            ? "bg-ink dark:bg-ink-light border-transparent shadow-xs"
                            : "bg-surface border-surface-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isActive
                              ? "text-surface dark:text-surface"
                              : "text-ink-muted"
                          }`}
                        >
                          {chip.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* 3. Settlement Timeline Stream */}
                {isLoading ? (
                  <ActivityIndicator className="my-6" color={PRIMARY} />
                ) : filteredSettlements.length === 0 ? (
                  <Surface
                    variant="flat"
                    className="p-8 rounded-3xl items-center border border-surface-border bg-surface text-center"
                  >
                    <View className="w-12 h-12 rounded-full bg-surface-muted border border-surface-border items-center justify-center mb-3">
                      <Feather name="check-circle" size={20} color="#71717A" />
                    </View>
                    <Text className="text-sm font-bold text-ink text-center mb-1">
                      No Settlements Recorded Yet
                    </Text>
                    <Text className="text-xs font-medium text-ink-muted text-center max-w-[280px]">
                      When you or your friends settle up a shared tab or loan, the complete log of how much money you got and settled will appear here.
                    </Text>
                  </Surface>
                ) : (
                  <View>
                    {filteredSettlements.map((item) => (
                      <SettlementHistoryCard
                        key={item.id}
                        settlement={item}
                        currency={currency}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}

      {/* 1. Dedicated Split Bill Modal (Equal or Custom shares, Account deduction toggle) */}
      <SplitBillModal
        visible={splitBillModalOpen}
        onClose={() => {
          setSplitBillModalOpen(false);
          setSplitBillFriendName(null);
        }}
        currency={currency}
        existingFriends={existingFriendNames}
        initialFriendName={splitBillFriendName}
        onSuccess={refetchAll}
      />

      {/* 2. Friend Account Detail Sheet */}
      <FriendDetailModal
        visible={Boolean(selectedFriendForDetail)}
        onClose={() => setSelectedFriendForDetail(null)}
        person={selectedFriendForDetail}
        currency={currency}
        onAddBillWithFriend={(friendName) => handleOpenSplitBill(friendName)}
        onSettleSplitItem={(item) => setSelectedSplitToSettle(item)}
      />

      {/* 3. Group Detail Modal */}
      <GroupDetailModal
        visible={!!selectedGroupForDetail}
        onClose={() => setSelectedGroupForDetail(null)}
        group={selectedGroupForDetail}
        splits={splits}
        currency={currency}
        onSettleSplit={(splitId) => {
          const target = splits.find((s) => s.id === splitId);
          if (target) setSelectedSplitToSettle(target);
        }}
      />

      {/* 4. Create Group Modal */}
      <CreateGroupModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={async (name, members) => {
          await createGroup({ name, memberNames: members });
        }}
        isSubmitting={isCreatingGroup}
      />

      {/* 5. People Directory Manager */}
      <PeopleManagerModal
        visible={peopleManagerOpen}
        onClose={() => setPeopleManagerOpen(false)}
        people={peopleSummaries}
        currency={currency}
        onRenamePerson={async (oldName, newName) => {
          await renamePerson({ oldName, newName });
        }}
        onDeletePerson={async (name) => {
          return await deletePerson(name);
        }}
      />

      {/* 6. Settlement Modal (Fractional or Full) */}
      <SettleModal
        split={selectedSplitToSettle}
        currency={currency}
        onClose={() => setSelectedSplitToSettle(null)}
        onConfirm={handleSettleConfirm}
        isSubmitting={isSettlingSplit}
      />
    </SafeAreaView>
  );
}
