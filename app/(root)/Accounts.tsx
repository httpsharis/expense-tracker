import { useUser } from "@clerk/expo";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSupabase } from "../../src/shared/hooks/useSupabase";
import { useUserStore } from "../../store/userStore";

export type AccountType = "cash" | "bank" | "wallet" | "savings";

interface AccountItem {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  is_default: boolean;
}

const ACCOUNT_TYPE_ICONS: Record<AccountType, keyof typeof Ionicons.glyphMap> =
  {
    cash: "cash-outline",
    bank: "business-outline",
    wallet: "wallet-outline",
    savings: "server-outline",
  };

export default function AccountsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const authSupabase = useSupabase();
  const queryClient = useQueryClient();
  const storeCurrency = useUserStore((state) => state.currency);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(
    null,
  );
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("bank");
  const [formError, setFormError] = useState("");

  // 1. Fetch Accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await authSupabase
        .from("accounts")
        .select("id, name, type, currency, is_default")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as AccountItem[];
    },
  });

  // 2. Set Default Mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (targetId: string) => {
      // Step A: Reset all accounts to false
      await authSupabase
        .from("accounts")
        .update({ is_default: false })
        .eq("user_id", user!.id);

      // Step B: Set chosen account as default
      const { error } = await authSupabase
        .from("accounts")
        .update({ is_default: true })
        .eq("id", targetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.id] });
    },
  });

  // 3. Save Account Mutation (Create / Edit)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!accountName.trim()) {
        throw new Error("Account name cannot be empty");
      }

      if (editingAccount) {
        // Edit existing
        const { error } = await authSupabase
          .from("accounts")
          .update({
            name: accountName.trim(),
            type: accountType,
          })
          .eq("id", editingAccount.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await authSupabase.from("accounts").insert({
          user_id: user!.id,
          name: accountName.trim(),
          type: accountType,
          currency: storeCurrency || "USD",
          is_default: accounts.length === 0,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.id] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to save account");
    },
  });

  const openCreateModal = () => {
    setEditingAccount(null);
    setAccountName("");
    setAccountType("bank");
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (account: AccountItem) => {
    setEditingAccount(account);
    setAccountName(account.name);
    setAccountType(account.type);
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAccount(null);
    setAccountName("");
    setFormError("");
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#F7F7F5] dark:bg-[#0A0A0B]"
      edges={["top"]}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-zinc-200/60 dark:bg-zinc-800/80 items-center justify-center active:opacity-75"
        >
          <Feather name="arrow-left" size={18} color="#71717A" />
        </Pressable>

        <Text className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Payment Accounts
        </Text>

        <Pressable
          onPress={openCreateModal}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 items-center justify-center active:opacity-80"
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Account List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#71717A" />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Ionicons name="wallet-outline" size={32} color="#A1A1AA" />
              <Text className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
                No accounts created yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const iconName = ACCOUNT_TYPE_ICONS[item.type] || "card-outline";
            return (
              <View className="flex-row items-center justify-between p-4 mb-3 rounded-2xl bg-white dark:bg-[#141416] border border-zinc-200/70 dark:border-zinc-800 shadow-sm">
                <Pressable
                  onPress={() => openEditModal(item)}
                  className="flex-row items-center gap-3.5 flex-1 mr-3"
                >
                  <View className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                    <Ionicons name={iconName} size={20} color="#71717A" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2">
                      <Text
                        numberOfLines={1}
                        className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
                      >
                        {item.name}
                      </Text>
                      {item.is_default && (
                        <View className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                          <Text className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                            Default
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-zinc-400 dark:text-zinc-500 uppercase mt-0.5">
                      {item.type} • {item.currency}
                    </Text>
                  </View>
                </Pressable>

                {/* Set Default Radio / Trigger */}
                <Pressable
                  onPress={() => setDefaultMutation.mutate(item.id)}
                  hitSlop={8}
                  className="p-2"
                >
                  <Ionicons
                    name={
                      item.is_default ? "radio-button-on" : "radio-button-off"
                    }
                    size={20}
                    color={item.is_default ? "#10B981" : "#A1A1AA"}
                  />
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {/* Create / Edit Account Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView className="flex-1 bg-[#F7F7F5] dark:bg-[#0A0A0B]">
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {editingAccount ? "Edit Account" : "Add Account"}
            </Text>
            <Pressable
              onPress={closeModal}
              hitSlop={12}
              className="p-1.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800"
            >
              <Feather name="x" size={18} color="#71717A" />
            </Pressable>
          </View>

          <View className="p-6 gap-6">
            {/* Account Name */}
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                Account Name
              </Text>
              <TextInput
                value={accountName}
                onChangeText={(val) => {
                  setFormError("");
                  setAccountName(val);
                }}
                placeholder="e.g. Chase Checking, Cash Wallet"
                placeholderTextColor="#A1A1AA"
                className="h-12 px-4 rounded-xl bg-white dark:bg-[#141416] border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-900 dark:text-zinc-100"
              />
            </View>

            {/* Account Type Chips */}
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                Account Type
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(["bank", "cash", "wallet", "savings"] as AccountType[]).map(
                  (type) => {
                    const isSelected = accountType === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setAccountType(type)}
                        className={`px-4 py-2.5 rounded-xl border ${
                          isSelected
                            ? "bg-zinc-900 dark:bg-zinc-100 border-transparent"
                            : "bg-white dark:bg-[#141416] border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold capitalize ${
                            isSelected
                              ? "text-white dark:text-zinc-950"
                              : "text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </View>

            {formError ? (
              <Text className="text-xs font-medium text-red-500">
                {formError}
              </Text>
            ) : null}

            {/* Save CTA */}
            <Pressable
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full h-14 bg-zinc-900 dark:bg-zinc-100 rounded-2xl items-center justify-center active:opacity-80 mt-4"
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-semibold text-white dark:text-zinc-950">
                  {editingAccount ? "Update Account" : "Create Account"}
                </Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
