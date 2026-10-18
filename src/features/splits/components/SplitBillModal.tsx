import Feather from "@expo/vector-icons/Feather";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createTransaction } from "@services/transactions";
import { useSupabase } from "@shared/hooks/useSupabase";
import { formatCurrency } from "@shared/lib/currency";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { Button } from "@shared/ui/Button";
import { Text } from "@shared/ui/Text";
import { TextField } from "@shared/ui/TextField";
import {
  useAccountsWithBalancesQuery,
  useCreateDirectPeopleSplitMutation,
  useCreateGroupMutation,
  useCreateTransactionSplitsMutation,
} from "@store/hooks";
import { useUser } from "@clerk/expo";

interface SplitBillModalProps {
  visible: boolean;
  onClose: () => void;
  currency: string;
  existingFriends?: string[];
  initialFriendName?: string | null;
  onSuccess?: () => void;
}

export function SplitBillModal({
  visible,
  onClose,
  currency,
  existingFriends = [],
  initialFriendName,
  onSuccess,
}: SplitBillModalProps) {
  const { user } = useUser();
  const supabase = useSupabase();

  const [description, setDescription] = useState("");
  const [totalAmountStr, setTotalAmountStr] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [newFriendInput, setNewFriendInput] = useState("");
  const [paidBy, setPaidBy] = useState<string>("You");
  const [splitMode, setSplitMode] = useState<"equal" | "exact">("equal");
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [deductFromAccount, setDeductFromAccount] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [saveAsGroup, setSaveAsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const { data: accounts = [] } = useAccountsWithBalancesQuery();
  const activeAccount =
    accounts.find((a) => a.id === selectedAccountId) ??
    accounts.find((a) => a.is_default) ??
    accounts[0];

  const createDirectSplitMutation = useCreateDirectPeopleSplitMutation();
  const createGroupMutation = useCreateGroupMutation();
  const createGroupSplitsMutation = useCreateTransactionSplitsMutation();

  // Reset or initialize when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      if (initialFriendName && initialFriendName.trim()) {
        setSelectedFriends([initialFriendName.trim()]);
      } else {
        setSelectedFriends([]);
      }
      setDescription("");
      setTotalAmountStr("");
      setNewFriendInput("");
      setPaidBy("You");
      setSplitMode("equal");
      setCustomShares({});
      setDeductFromAccount(true);
      setSaveAsGroup(false);
      setGroupName("");
    }
  }, [visible, initialFriendName]);

  const totalAmount = parseFloat(totalAmountStr) || 0;
  const allParticipants = useMemo(() => ["You", ...selectedFriends], [selectedFriends]);

  // Handle adding a new friend name
  const handleAddNewFriend = () => {
    const trimmed = newFriendInput.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === "you") {
      setNewFriendInput("");
      return;
    }
    if (selectedFriends.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      setNewFriendInput("");
      return;
    }
    setSelectedFriends((prev) => [...prev, trimmed]);
    setNewFriendInput("");
  };

  // Toggle friend selection
  const handleToggleFriend = (name: string) => {
    if (selectedFriends.includes(name)) {
      setSelectedFriends((prev) => prev.filter((f) => f !== name));
      if (paidBy === name) setPaidBy("You");
    } else {
      setSelectedFriends((prev) => [...prev, name]);
    }
  };

  // Compute equal split per person
  const equalSharePerPerson = useMemo(() => {
    if (totalAmount <= 0 || allParticipants.length === 0) return 0;
    return fromMinorUnits(Math.floor(toMinorUnits(totalAmount) / allParticipants.length));
  }, [totalAmount, allParticipants.length]);

  // Validate custom shares if exact mode
  const customTotalMinor = useMemo(() => {
    if (splitMode !== "exact") return toMinorUnits(totalAmount);
    return allParticipants.reduce((sum, name) => {
      const val = parseFloat(customShares[name] || "0") || 0;
      return sum + toMinorUnits(val);
    }, 0);
  }, [splitMode, allParticipants, customShares, totalAmount]);

  const totalMinor = toMinorUnits(totalAmount);
  const isCustomExactMatch = splitMode === "equal" || customTotalMinor === totalMinor;

  const isFormValid =
    description.trim().length > 0 &&
    totalAmount > 0 &&
    selectedFriends.length > 0 &&
    isCustomExactMatch &&
    (!deductFromAccount || Boolean(activeAccount?.id));

  const handleSave = async () => {
    if (submittingRef.current || isSubmitting || !isFormValid || !user?.id) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const accountId = activeAccount?.id ?? accounts[0]?.id;
      if (!accountId) {
        throw new Error("Please create an account first to log this expense.");
      }

      // 1. Create transaction in Supabase
      // If deductFromAccount is true, status is 'completed' (debits wallet balance via DB trigger)
      // If deductFromAccount is false, status is 'pending' (wallet balance stays untouched)
      const tx = await createTransaction(supabase, {
        user_id: user.id,
        account_id: accountId,
        amount: totalAmount,
        type: "expense",
        description: description.trim(),
        status: deductFromAccount ? "completed" : "pending",
        input_method: "manual",
        date: new Date().toISOString(),
      });

      // Prepare custom amounts if exact mode
      const customAmountsMap: Record<string, number> | undefined =
        splitMode === "exact"
          ? Object.fromEntries(
              allParticipants.map((name) => [
                name,
                parseFloat(customShares[name] || "0") || 0,
              ]),
            )
          : undefined;

      // 2. If user checked "Save as a Group" and more than 1 friend
      if (saveAsGroup && groupName.trim() && selectedFriends.length > 1) {
        const createdGroup = await createGroupMutation.mutateAsync({
          name: groupName.trim(),
          memberNames: selectedFriends,
        });

        await createGroupSplitsMutation.mutateAsync({
          transactionId: tx.id,
          groupId: createdGroup.id,
          totalAmount,
          members: createdGroup.members,
          description: description.trim(),
          payerName: paidBy,
          splitMode,
          customAmounts: customAmountsMap,
        });
      } else {
        // Standard direct friend split
        await createDirectSplitMutation.mutateAsync({
          transactionId: tx.id,
          totalAmount,
          peopleNames: selectedFriends,
          description: description.trim(),
          payerName: paidBy,
          splitMode,
          customAmounts: customAmountsMap,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      Alert.alert(
        "Could Not Save Split",
        err instanceof Error ? err.message : "Failed to record split expense.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

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
          <View>
            <Text className="text-lg font-black text-ink tracking-tight">
              Split an Expense
            </Text>
            <Text className="text-xs font-medium text-ink-muted">
              Add friends, split equally or custom, and track tabs
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95 shadow-2xs"
          >
            <Feather name="x" size={16} color="#A1A1AA" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        >
          {/* 1. What was the expense? */}
          <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-1.5 px-1">
            Expense Name & Total Bill
          </Text>
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Dinner, Groceries, Movie Tickets"
            className="mb-2.5"
          />
          <TextField
            value={totalAmountStr}
            onChangeText={setTotalAmountStr}
            placeholder={`0.00 (${currency})`}
            keyboardType="numeric"
            className="mb-5"
          />

          {/* 2. Who is splitting? */}
          <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-1.5 px-1">
            Who was there? ({allParticipants.length} people)
          </Text>

          {/* Friend chips */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            <View className="px-3.5 py-2 rounded-full bg-surface-muted border border-primary/40 flex-row items-center gap-1.5">
              <Feather name="user" size={12} color="#22C55E" />
              <Text className="text-xs font-bold text-primary">You (Included)</Text>
            </View>

            {/* Existing friends chips */}
            {existingFriends.map((friend) => {
              const isSelected = selectedFriends.includes(friend);
              return (
                <Pressable
                  key={friend}
                  onPress={() => handleToggleFriend(friend)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  className={`px-3.5 py-2 rounded-full border flex-row items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? "bg-zinc-900 dark:bg-zinc-100 border-transparent shadow-xs"
                      : "bg-surface border-surface-border"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? "text-white dark:text-zinc-950" : "text-ink"
                    }`}
                  >
                    {friend}
                  </Text>
                  {isSelected && (
                    <Feather
                      name="check"
                      size={12}
                      color={isSubmitting ? "#A1A1AA" : "#22C55E"}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Add a new friend name inline */}
          <View className="flex-row gap-2 mb-5">
            <View className="flex-1">
              <TextField
                value={newFriendInput}
                onChangeText={setNewFriendInput}
                placeholder="Add friend's name..."
                returnKeyType="done"
                onSubmitEditing={handleAddNewFriend}
              />
            </View>
            <Pressable
              onPress={handleAddNewFriend}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              className="px-4 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-100 items-center justify-center active:scale-95 shadow-2xs"
            >
              <Text className="text-xs font-bold text-white dark:text-zinc-950">Add</Text>
            </Pressable>
          </View>

          {/* 3. Who paid? */}
          <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-1.5 px-1">
            Who paid for the bill?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            <View className="flex-row gap-2">
              {allParticipants.map((name) => {
                const isPayer = paidBy === name;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setPaidBy(name)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    className={`px-4 py-2.5 rounded-2xl border active:scale-95 ${
                      isPayer
                        ? "bg-primary border-primary shadow-2xs"
                        : "bg-surface border-surface-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isPayer ? "text-white" : "text-ink"
                      }`}
                    >
                      {name === "You" ? "You paid" : `${name} paid`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* 4. Split Mode: Equal vs Custom Amounts */}
          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase">
              Split Distribution
            </Text>
            <View className="flex-row rounded-xl bg-surface-muted p-0.5 border border-surface-border">
              <Pressable
                onPress={() => setSplitMode("equal")}
                className={`px-3 py-1 rounded-lg ${
                  splitMode === "equal" ? "bg-surface shadow-2xs" : ""
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    splitMode === "equal" ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  Split Equally
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSplitMode("exact")}
                className={`px-3 py-1 rounded-lg ${
                  splitMode === "exact" ? "bg-surface shadow-2xs" : ""
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    splitMode === "exact" ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  Custom Amounts
                </Text>
              </Pressable>
            </View>
          </View>

          {/* If Equal: Show summary */}
          {splitMode === "equal" ? (
            <View className="p-3.5 rounded-2xl bg-surface-muted border border-surface-border mb-5">
              <Text className="text-xs text-ink-muted">
                {totalAmount > 0 ? (
                  <>
                    Each person's share:{" "}
                    <Text className="font-bold text-ink">
                      {formatCurrency(equalSharePerPerson, currency)}
                    </Text>{" "}
                    ({allParticipants.length} people)
                  </>
                ) : (
                  "Enter total bill amount to calculate shares."
                )}
              </Text>
            </View>
          ) : (
            /* If Custom Exact: Show inputs for each participant */
            <View className="p-4 rounded-2xl bg-surface-muted border border-surface-border mb-5 gap-2.5">
              <Text className="text-xs font-medium text-ink-muted mb-1">
                Enter each person's exact portion:
              </Text>
              {allParticipants.map((name) => (
                <View key={name} className="flex-row items-center justify-between gap-3">
                  <Text className="text-xs font-bold text-ink flex-1">
                    {name}
                  </Text>
                  <View className="w-32">
                    <TextField
                      value={customShares[name] || ""}
                      onChangeText={(val) =>
                        setCustomShares((prev) => ({ ...prev, [name]: val }))
                      }
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ))}

              {/* Validation Check */}
              <View className="mt-2 pt-2 border-t border-surface-border flex-row items-center justify-between">
                <Text className="text-[11px] font-medium text-ink-muted">
                  Total Allocated:
                </Text>
                <Text
                  className={`text-xs font-bold ${
                    isCustomExactMatch ? "text-primary" : "text-coral"
                  }`}
                >
                  {formatCurrency(fromMinorUnits(customTotalMinor), currency)} /{" "}
                  {formatCurrency(totalAmount, currency)}
                </Text>
              </View>
            </View>
          )}

          {/* 5. Account Deduction Option (Crucial user requirement) */}
          <View className="p-4 rounded-2xl bg-surface border border-surface-border mb-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-bold text-ink">
                  Deduct from My Balance
                </Text>
                <Text className="text-[11px] text-ink-muted mt-0.5">
                  {deductFromAccount
                    ? "Debit your wallet/bank for this payment"
                    : "Do not touch wallet balance (external/off-book payment)"}
                </Text>
              </View>
              <Switch
                value={deductFromAccount}
                onValueChange={setDeductFromAccount}
                trackColor={{ false: "#E4E4E7", true: "#22C55E" }}
                thumbColor="#FFFFFF"
              />
            </View>

            {deductFromAccount && (
              <View className="mt-3 pt-3 border-t border-surface-border">
                <Text className="text-[10px] font-bold text-ink-whisper uppercase tracking-wider mb-2">
                  Deduct From Account
                </Text>
                <View className="gap-1.5">
                  {accounts.map((acc) => {
                    const isSelected = activeAccount?.id === acc.id;
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        className={`p-2.5 rounded-xl border flex-row items-center justify-between ${
                          isSelected
                            ? "bg-surface-muted border-primary"
                            : "bg-surface border-surface-border"
                        }`}
                      >
                        <Text className="text-xs font-bold text-ink">
                          {acc.name}
                        </Text>
                        <Text className="text-[10px] text-ink-muted">
                          {formatCurrency(acc.balance, currency)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* 6. Save as Group (Optional if > 1 friend) */}
          {selectedFriends.length > 1 && (
            <View className="p-4 rounded-2xl bg-surface border border-surface-border mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-xs font-bold text-ink">
                    Save as Group
                  </Text>
                  <Text className="text-[11px] text-ink-muted mt-0.5">
                    Save these friends as a shared group for next time
                  </Text>
                </View>
                <Switch
                  value={saveAsGroup}
                  onValueChange={setSaveAsGroup}
                  trackColor={{ false: "#E4E4E7", true: "#22C55E" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {saveAsGroup && (
                <View className="mt-3 pt-3 border-t border-surface-border">
                  <TextField
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholder="Group name (e.g. Flatmates, Trip to Lahore)"
                  />
                </View>
              )}
            </View>
          )}

          {/* Save Button */}
          <Button
            label={`Split ${totalAmount > 0 ? formatCurrency(totalAmount, currency) : "Bill"}`}
            onPress={handleSave}
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

