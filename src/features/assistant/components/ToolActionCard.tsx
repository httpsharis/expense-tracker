import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

import type { ToolCallAction } from "@services/ai/types";
import { formatCurrency } from "@shared/lib/currency";
import { fromMinorUnits } from "@shared/lib/money";
import { Surface } from "@shared/ui/Surface";
import { Text } from "@shared/ui/Text";

interface ToolActionCardProps {
  action: ToolCallAction;
  currency: string;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}

export function ToolActionCard({
  action,
  currency,
  onConfirmDelete,
  onCancelDelete,
}: ToolActionCardProps) {
  const isPendingConfirmation = action.status === "pending_confirmation";
  const isConfirmed =
    action.status === "confirmed" || action.status === "success";
  const isRejected =
    action.status === "cancelled" || action.status === "rejected";

  // 1. Single Transaction Logged Immediately
  if (
    (action.name === "log_transaction" || action.name === "log_transactions") &&
    !isPendingConfirmation &&
    action.result?.transaction &&
    (!action.proposal || action.proposal.kind !== "log_transactions")
  ) {
    const tx = action.result.transaction as {
      description?: string | null;
      account?: { name?: string } | null;
      account_name?: string;
      type?: string;
      amount?: number;
    };
    const accountLabel = tx.account?.name || tx.account_name || "Account";
    return (
      <Surface
        variant="flat"
        className="mt-2.5 p-4 rounded-2xl flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 items-center justify-center">
            <Feather name="check" size={16} color="#22C55E" />
          </View>
          <View>
            <Text className="text-sm font-bold text-ink">
              {tx.description}
            </Text>
            <Text className="text-xs text-ink-muted mt-0.5">
              {accountLabel} • {tx.type === "income" ? "Deposit" : "Paid"}
            </Text>
          </View>
        </View>
        <Text className="text-sm font-black text-ink tabular-nums">
          {formatCurrency(Number(tx.amount ?? 0), currency)}
        </Text>
      </Surface>
    );
  }

  // 2. Batch Transactions Proposal Card
  if (action.proposal?.kind === "log_transactions") {
    const batch = action.proposal;
    return (
      <Surface variant="flat" className="mt-2.5 p-4 rounded-2xl">
        <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-surface-divider">
          <View className="flex-row items-center gap-2">
            <Feather name="layers" size={16} color="#22C55E" />
            <Text className="text-sm font-bold text-ink">
              Batch Entry ({batch.items.length} items)
            </Text>
          </View>
          {batch.totalExpenseMinor > 0 && (
            <Text className="text-sm font-black text-ink tabular-nums">
              {formatCurrency(
                fromMinorUnits(batch.totalExpenseMinor),
                currency,
              )}
            </Text>
          )}
        </View>

        <View className="gap-2 mb-3">
          {batch.items.map((item, idx) => (
            <View
              key={`${item.description}-${idx}`}
              className="flex-row items-center justify-between"
            >
              <Text className="text-xs text-ink-muted">
                {item.description} ({item.categoryName})
              </Text>
              <Text className="text-xs font-bold text-ink tabular-nums">
                {item.type === "income" ? "+" : "-"}
                {formatCurrency(item.amount, currency)}
              </Text>
            </View>
          ))}
        </View>

        {isPendingConfirmation && (
          <View className="flex-row gap-2">
            {onCancelDelete && (
              <Pressable
                onPress={onCancelDelete}
                accessibilityRole="button"
                accessibilityLabel="Cancel batch transactions"
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-surface-muted border border-surface-border items-center justify-center active:opacity-80"
              >
                <Text className="text-xs font-semibold text-ink-muted">
                  Cancel
                </Text>
              </Pressable>
            )}
            {onConfirmDelete && (
              <Pressable
                onPress={onConfirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Confirm batch transactions"
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-primary items-center justify-center active:opacity-90"
              >
                <Text className="text-xs font-bold text-white">
                  Record All ({batch.items.length})
                </Text>
              </Pressable>
            )}
          </View>
        )}
        {isConfirmed && (
          <Text className="text-[11px] font-bold text-primary">
            Recorded {batch.items.length} transactions
          </Text>
        )}
        {isRejected && (
          <Text className="text-[11px] font-medium text-ink-whisper">
            Cancelled
          </Text>
        )}
      </Surface>
    );
  }

  // 3. Shared Split Expense Proposal Card (Gold token reserved for open debt obligations)
  if (action.proposal?.kind === "create_split_expense") {
    const split = action.proposal;
    return (
      <View className="mt-2.5 p-4 rounded-2xl bg-gold-dim border border-gold/30">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Feather name="users" size={16} color="#C9A24B" />
            <Text className="text-sm font-bold text-gold">
              {split.description} • {split.participantCount} People
            </Text>
          </View>
          <Text className="text-sm font-black text-ink tabular-nums">
            {formatCurrency(split.totalAmount, currency)}
          </Text>
        </View>

        <Text className="text-xs text-ink-muted mb-2.5 leading-relaxed">
          {split.mode === "friend_paid"
            ? `${split.paidBy} paid the bill. Your share is ${formatCurrency(split.myShareAmount, currency)}.`
            : `You paid from ${split.accountName || "Account"}. Your share is ${formatCurrency(split.myShareAmount, currency)}.`}
        </Text>

        <View className="gap-1.5 mb-3">
          {split.participants.map((participant) => (
            <View
              key={participant.name}
              className="flex-row items-center justify-between"
            >
              <Text className="text-xs font-medium text-ink">
                {participant.direction === "i_owe"
                  ? `You owe ${participant.name}`
                  : `${participant.name} owes you`}
                {participant.isNewPerson ? " (New)" : ""}
              </Text>
              <Text className="text-xs font-bold text-gold tabular-nums">
                {formatCurrency(participant.shareAmount, currency)}
              </Text>
            </View>
          ))}
        </View>

        {isPendingConfirmation && (
          <View className="flex-row gap-2">
            {onCancelDelete && (
              <Pressable
                onPress={onCancelDelete}
                accessibilityRole="button"
                accessibilityLabel="Cancel split expense"
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-surface-muted border border-surface-border items-center justify-center active:opacity-80"
              >
                <Text className="text-xs font-semibold text-ink-muted">
                  Cancel
                </Text>
              </Pressable>
            )}
            {onConfirmDelete && (
              <Pressable
                onPress={onConfirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Confirm split expense"
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-gold items-center justify-center active:opacity-90"
              >
                <Text className="text-xs font-bold text-white">
                  Confirm Split
                </Text>
              </Pressable>
            )}
          </View>
        )}
        {isConfirmed && (
          <Text className="text-[11px] font-bold text-primary">
            Split recorded in ledger
          </Text>
        )}
        {isRejected && (
          <Text className="text-[11px] font-medium text-ink-whisper">
            Cancelled
          </Text>
        )}
      </View>
    );
  }

  // 4. Direct Loan Proposal Card
  if (action.proposal?.kind === "create_loan") {
    const loan = action.proposal;
    return (
      <View className="mt-2.5 p-3.5 rounded-2xl bg-gold-dim border border-gold/30">
        <View className="flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center gap-2">
            <Feather name="repeat" size={14} color="#C9A24B" />
            <Text className="text-xs font-bold text-gold">
              {loan.direction === "lent"
                ? `Loan to ${loan.personName}`
                : `Borrowed from ${loan.personName}`}
            </Text>
          </View>
          <Text className="text-xs font-bold text-gold tabular-nums">
            {formatCurrency(loan.amount, currency)}
          </Text>
        </View>

        <Text className="text-[11px] text-ink-muted mb-3">
          {loan.note} • {loan.accountName}
        </Text>

        {isPendingConfirmation && (
          <View className="flex-row gap-2">
            {onCancelDelete && (
              <Pressable
                onPress={onCancelDelete}
                accessibilityRole="button"
                accessibilityLabel="Cancel loan"
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-surface-muted border border-surface-border items-center justify-center active:opacity-80"
              >
                <Text className="text-xs font-semibold text-ink-muted">
                  Cancel
                </Text>
              </Pressable>
            )}
            {onConfirmDelete && (
              <Pressable
                onPress={onConfirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Confirm loan"
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-gold items-center justify-center active:opacity-90"
              >
                <Text className="text-xs font-bold text-white">
                  Confirm Loan
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  // 5. Group Created Card
  if (action.name === "create_group" && action.result?.group) {
    const group = action.result.group;
    return (
      <Surface variant="flat" className="mt-2.5 p-3.5 rounded-2xl">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 items-center justify-center">
            <Feather name="users" size={14} color="#22C55E" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-ink">
              {group.name}
            </Text>
            <Text className="text-[10px] text-ink-muted">
              Members: {group.members.join(", ")}
            </Text>
          </View>
        </View>
      </Surface>
    );
  }

  // 6. Destructive Reversal / Delete Confirmation Card
  if (
    (action.name === "delete_transaction" ||
      action.name === "propose_delete_transaction") &&
    isPendingConfirmation
  ) {
    const txLabel =
      action.proposal?.kind === "propose_delete_transaction"
        ? `${action.proposal.transaction.description || "Transaction"} (${formatCurrency(Number(action.proposal.transaction.amount), currency)})`
        : String(action.arguments.transaction_id ?? "");

    return (
      <View className="mt-2.5 p-3.5 rounded-2xl bg-coral/10 border border-coral/25">
        <View className="flex-row items-center gap-2 mb-1.5">
          <Feather name="alert-triangle" size={14} color="#EF4444" />
          <Text className="text-xs font-bold text-coral">
            Confirm Reversal
          </Text>
        </View>
        <Text className="text-[11px] text-ink-muted leading-4 mb-3">
          Reverse <Text className="font-bold text-ink">{txLabel}</Text>?
          This marks the transaction cancelled and posts an offsetting ledger
          reversal.
        </Text>
        <View className="flex-row gap-2">
          {onCancelDelete && (
            <Pressable
              onPress={onCancelDelete}
              accessibilityRole="button"
              accessibilityLabel="Cancel transaction reversal"
              className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-surface-muted border border-surface-border items-center justify-center active:opacity-80"
            >
              <Text className="text-xs font-semibold text-ink-muted">
                Cancel
              </Text>
            </Pressable>
          )}
          {onConfirmDelete && (
            <Pressable
              onPress={onConfirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Confirm transaction reversal"
              className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-coral items-center justify-center active:opacity-90 shadow-2xs"
            >
              <Text className="text-xs font-bold text-white">Confirm</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // 7. Financial Summary Card
  if (
    action.name === "get_financial_summary" &&
    Array.isArray(action.result?.accounts)
  ) {
    const accounts = action.result.accounts as Array<{
      name: string;
      balance: number;
      currency?: string;
    }>;
    const totalWorth = Number(action.result.total_liquid_net_worth ?? 0);
    return (
      <Surface variant="flat" className="mt-2.5 p-3.5 rounded-2xl">
        <View className="flex-row items-center justify-between pb-2 mb-2 border-b border-surface-divider">
          <Text className="text-[10px] font-bold text-ink-whisper uppercase tracking-wider">
            Account Balances
          </Text>
          <Text className="text-xs font-bold text-ink tabular-nums">
            {formatCurrency(totalWorth, currency)}
          </Text>
        </View>
        <View className="gap-1.5">
          {accounts.map((acc, idx) => (
            <View key={idx} className="flex-row justify-between">
              <Text className="text-[11px] font-medium text-ink-muted">
                {acc.name}
              </Text>
              <Text className="text-[11px] font-bold text-ink tabular-nums">
                {formatCurrency(acc.balance, acc.currency || currency)}
              </Text>
            </View>
          ))}
        </View>
      </Surface>
    );
  }

  return null;
}
