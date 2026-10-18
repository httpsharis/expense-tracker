import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountType, AccountWithBalance } from "@services/accounts";
import {
    AccountCard,
    AccountFilterChips,
    AccountFormModal,
    AccountTotalBanner,
} from "@features/accounts";
import {
    useAccountsWithBalancesQuery,
    useCreateAccountMutation,
    useDeleteAccountMutation,
    useSetDefaultAccountMutation,
    useUpdateAccountMutation,
} from "@store/hooks";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";

export default function AccountsScreen() {
  const router = useRouter();
  const storeCurrency = useUserStore((state) => state.currency);
  const { confirm, alert } = usePrompt();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedAccount, setSelectedAccount] =
    useState<AccountWithBalance | null>(null);

  // Queries & Mutations
  const { data: accounts = [], isLoading } = useAccountsWithBalancesQuery();
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation();
  const deleteMutation = useDeleteAccountMutation();
  const setDefaultMutation = useSetDefaultAccountMutation();

  const totalBalance = useMemo(() => {
    return accounts.reduce((acc, a) => acc + Number(a.balance), 0);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (activeFilter === "all") return accounts;
    return accounts.filter((a) => a.type === activeFilter);
  }, [accounts, activeFilter]);

  const handleOpenAddModal = () => {
    setModalMode("create");
    setSelectedAccount(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (acc: AccountWithBalance) => {
    setModalMode("edit");
    setSelectedAccount(acc);
    setModalOpen(true);
  };

  const handleSaveAccount = async (payload: {
    name: string;
    type: AccountType;
    isDefault: boolean;
    initialBalance?: number;
    balanceAdjustmentDelta?: number;
  }) => {
    if (modalMode === "create") {
      await createMutation.mutateAsync({
        name: payload.name,
        type: payload.type,
        currency: storeCurrency || "PKR",
        is_default: payload.isDefault,
        initialBalance: payload.initialBalance,
      });
    } else if (modalMode === "edit" && selectedAccount) {
      await updateMutation.mutateAsync({
        id: selectedAccount.id,
        name: payload.name,
        type: payload.type,
        is_default: payload.isDefault,
        balanceAdjustmentDelta: payload.balanceAdjustmentDelta,
      });
    }
    setModalOpen(false);
  };

  const handleDeleteAccount = async (acc: AccountWithBalance) => {
    if (modalOpen) setModalOpen(false);

    if (accounts.length <= 1) {
      await alert({
        title: "Cannot Delete Account",
        message:
          "You must keep at least one active account to track your finances.",
        variant: "warning",
        confirmText: "Understood",
      });
      return;
    }

    const confirmed = await confirm({
      title: `Delete "${acc.name}"?`,
      message:
        "Are you sure you want to delete this account? All associated transaction entries and ledger history for this account will be permanently removed.",
      variant: "danger",
      confirmText: "Delete account",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(acc.id);
    } catch (err: any) {
      await alert({
        title: "Delete Failed",
        message: err.message || "Failed to delete account. Please try again.",
        variant: "danger",
      });
    }
  };

  const handleSetDefault = async (acc: AccountWithBalance) => {
    if (acc.is_default) return;
    try {
      await setDefaultMutation.mutateAsync(acc.id);
    } catch (err: any) {
      await alert({
        title: "Action Failed",
        message: err.message || "Unable to set primary account.",
        variant: "warning",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB]" edges={["top"]}>
      {/* 1. Header Navigation */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 rounded-full bg-white border border-[#E4E7EC] items-center justify-center active:bg-[#F4F5F7] shadow-xs"
        >
          <Feather name="arrow-left" size={18} color="#090D16" />
        </Pressable>

        <Text className="text-base font-bold text-[#090D16] tracking-tight">
          Accounts
        </Text>

        <Pressable
          onPress={handleOpenAddModal}
          accessibilityRole="button"
          accessibilityLabel="Add new account"
          className="h-10 px-3.5 rounded-full bg-[#090D16] flex-row items-center gap-1.5 shadow-xs active:opacity-85"
        >
          <Feather name="plus" size={16} color="#D4F938" />
          <Text className="text-xs font-bold text-white">Add</Text>
        </Pressable>
      </View>

      {/* 2. Total Balance Banner */}
      <AccountTotalBanner
        totalBalance={totalBalance}
        accountsCount={accounts.length}
        currency={storeCurrency}
      />

      {/* 3. Filter Chips */}
      <AccountFilterChips
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* 4. Accounts Cards List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#090D16" />
        </View>
      ) : (
        <FlatList
          data={filteredAccounts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: 110,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <View className="w-16 h-16 rounded-3xl bg-white items-center justify-center border border-[#E4E7EC] mb-3 shadow-xs">
                <Ionicons name="wallet-outline" size={28} color="#94A3B8" />
              </View>
              <Text className="text-base font-bold text-[#090D16]">
                No accounts found
              </Text>
              <Text className="text-xs text-[#64748B] text-center mt-1 max-w-[220px]">
                Tap 'Add' in the top corner to set up an account.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <AccountCard
              account={item}
              storeCurrency={storeCurrency}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteAccount}
              onSetDefault={handleSetDefault}
            />
          )}
        />
      )}

      {/* 5. Unified Create & Edit Account Modal */}
      <AccountFormModal
        visible={modalOpen}
        mode={modalMode}
        account={selectedAccount}
        accountsCount={accounts.length}
        storeCurrency={storeCurrency}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAccount}
        onDelete={handleDeleteAccount}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </SafeAreaView>
  );
}
