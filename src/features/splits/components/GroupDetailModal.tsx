import Feather from "@expo/vector-icons/Feather";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { GroupWithMembers, SplitDetailItem } from "@services/splits";
import { formatCurrency } from "@shared/lib/currency";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { Surface } from "@shared/ui/Surface";
import { Text } from "@shared/ui/Text";

interface GroupDetailModalProps {
  visible: boolean;
  onClose: () => void;
  group: GroupWithMembers | null;
  splits: SplitDetailItem[];
  currency: string;
  onSettleSplit?: (splitId: string) => void;
}

export function GroupDetailModal({
  visible,
  onClose,
  group,
  splits,
  currency,
  onSettleSplit,
}: GroupDetailModalProps) {
  if (!group) return null;

  // Filter splits associated with members of this group
  const memberIds = new Set((group.members || []).map((m) => m.id));
  const groupSplits = splits.filter((s) => memberIds.has(s.group_member_id));

  // Compute members balance in integer minor units
  const memberBalances = (group.members || []).map((m) => {
    const isYou = m.name.toLowerCase() === "you";
    const pendingSplits = groupSplits.filter(
      (s) =>
        s.group_member_id === m.id &&
        (s.status === "open" || s.status === "partial"),
    );
    const owedMinor = pendingSplits
      .filter((s) => s.direction === "owed_to_me")
      .reduce(
        (accMinor, curr) =>
          accMinor + toMinorUnits(curr.remaining_amount ?? curr.share_amount),
        0,
      );
    const debtMinor = pendingSplits
      .filter((s) => s.direction === "i_owe")
      .reduce(
        (accMinor, curr) =>
          accMinor + toMinorUnits(curr.remaining_amount ?? curr.share_amount),
        0,
      );

    const hasOverdue = pendingSplits.some(
      (s) => s.due_date && new Date(s.due_date) < new Date(),
    );

    return {
      member: m,
      isYou,
      owedAmount: fromMinorUnits(owedMinor),
      debtAmount: fromMinorUnits(debtMinor),
      net: fromMinorUnits(owedMinor - debtMinor),
      pendingCount: pendingSplits.length,
      hasOverdue,
    };
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-canvas">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-border bg-surface">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center">
              <Feather name="users" size={17} color="#22C55E" />
            </View>
            <View>
              <Text className="text-base font-black text-ink tracking-tight">
                {group.name}
              </Text>
              <Text className="text-xs font-medium text-ink-muted">
                {group.members?.length || 0} members · Shared Ledger
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close group details"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="x" size={16} color="#A1A1AA" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          {/* Group Overview Banner */}
          <Surface
            variant="flat"
            className="p-5 rounded-3xl mb-6 border border-surface-border bg-surface shadow-2xs"
          >
            <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-1">
              Group Summary
            </Text>
            <View className="flex-row items-baseline justify-between mt-1">
              <Text className="text-2xl font-black text-ink">
                {formatCurrency(group.total_expenses || 0, currency)}
              </Text>
              <Text className="text-xs font-medium text-ink-muted">
                Total Expenses Logged
              </Text>
            </View>
          </Surface>

          {/* Members Breakdown */}
          <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-3 px-1">
            Group Members ({group.members?.length || 0})
          </Text>

          <View className="gap-2.5 mb-8">
            {memberBalances.map(
              ({ member, isYou, owedAmount, debtAmount, net, hasOverdue }) => {
                const hasDebt = net !== 0;
                const isNetOwedToMe = net > 0;

                return (
                  <Surface
                    key={member.id}
                    variant="flat"
                    className="p-3.5 rounded-2xl border border-surface-border bg-surface flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center">
                        <Text className="text-xs font-bold text-ink">
                          {(member.name?.[0] || "?").toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-ink">
                          {member.name} {isYou && "(You)"}
                        </Text>
                        <Text className="text-[10px] text-ink-muted">
                          {hasDebt
                            ? isNetOwedToMe
                              ? `Owes you ${formatCurrency(owedAmount, currency)}`
                              : `You owe ${formatCurrency(debtAmount, currency)}`
                            : "All clear"}
                        </Text>
                      </View>
                    </View>

                    {hasDebt ? (
                      <View
                        className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
                          hasOverdue
                            ? "bg-[#C9A24B]/15 border border-[#C9A24B]/30"
                            : "bg-surface-muted border border-surface-border"
                        }`}
                      >
                        <View
                          className={`w-1.5 h-1.5 rounded-full ${
                            hasOverdue
                              ? "bg-[#C9A24B]"
                              : isNetOwedToMe
                                ? "bg-primary"
                                : "bg-rose-500"
                          }`}
                        />
                        <Text
                          className={`text-xs font-bold ${
                            hasOverdue
                              ? "text-[#C9A24B]"
                              : isNetOwedToMe
                                ? "text-primary"
                                : "text-rose-500"
                          }`}
                        >
                          {formatCurrency(Math.abs(net), currency)}
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Feather name="check" size={11} color="#22C55E" />
                        <Text className="text-xs font-bold text-primary">
                          Clear
                        </Text>
                      </View>
                    )}
                  </Surface>
                );
              },
            )}
          </View>

          {/* Group Activity Log */}
          <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-3 px-1">
            Activity in this Group ({groupSplits.length})
          </Text>

          {groupSplits.length === 0 ? (
            <Surface
              variant="flat"
              className="p-6 rounded-2xl items-center border border-surface-border bg-surface"
            >
              <Text className="text-xs text-ink-muted text-center">
                No split items recorded for this group yet. Split an expense
                from the Add tab.
              </Text>
            </Surface>
          ) : (
            <View className="gap-2.5">
              {groupSplits.map((item) => {
                const remaining = item.remaining_amount ?? item.share_amount;
                const paid = item.paid_amount ?? 0;
                const isPartial = item.status === "partial" || (paid > 0 && item.status !== "settled");
                const isSettled = item.status === "settled";

                return (
                  <Surface
                    key={item.id}
                    variant="flat"
                    className="p-3.5 rounded-2xl border border-surface-border bg-surface flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text
                          className="text-xs font-bold text-ink"
                          numberOfLines={1}
                        >
                          {item.transaction_description || "Group Expense"}
                        </Text>
                        {isPartial && (
                          <View className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                            <Text className="text-[9px] font-bold text-amber-500">
                              PARTIAL
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-ink-muted mt-0.5">
                        {item.member_name} ·{" "}
                        <Text className="font-bold text-ink">
                          {isSettled
                            ? formatCurrency(item.share_amount, currency)
                            : `${formatCurrency(remaining, currency)} remaining`}
                        </Text>
                        {isPartial && ` (${formatCurrency(paid, currency)} paid)`}
                      </Text>
                    </View>

                    {item.status === "open" ||
                    item.status === "pending" ||
                    item.status === "partial" ? (
                      onSettleSplit ? (
                        <Pressable
                          onPress={() => {
                            onSettleSplit(item.id);
                            onClose();
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Settle split for ${item.member_name}`}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          className="px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 active:scale-95 shadow-2xs"
                        >
                          <Text className="text-xs font-bold text-white dark:text-zinc-950">
                            Settle
                          </Text>
                        </Pressable>
                      ) : (
                        <View
                          className={`px-2.5 py-1 rounded-full ${
                            item.due_date && new Date(item.due_date) < new Date()
                              ? "bg-[#C9A24B]/15 border border-[#C9A24B]/30"
                              : "bg-surface-muted border border-surface-border"
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-bold ${
                              item.due_date &&
                              new Date(item.due_date) < new Date()
                                ? "text-[#C9A24B]"
                                : "text-ink-muted"
                            }`}
                          >
                            {item.due_date && new Date(item.due_date) < new Date()
                              ? "Overdue"
                              : "Pending"}
                          </Text>
                        </View>
                      )
                    ) : (
                      <View className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 flex-row items-center gap-1">
                        <Feather name="check" size={10} color="#22C55E" />
                        <Text className="text-[11px] font-bold text-primary">
                          Settled
                        </Text>
                      </View>
                    )}
                  </Surface>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
