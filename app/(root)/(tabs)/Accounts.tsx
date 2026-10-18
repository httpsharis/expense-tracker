import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColorScheme } from "nativewind";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AccountCard,
  AccountFilterChips,
  AccountFormModal,
  AccountTotalBanner,
} from "@features/accounts";
import { AccountType, AccountWithBalance } from "@services/accounts";
import { getErrorMessage } from "@shared/lib/errors";
import { sumMoney } from "@shared/lib/money";
import { PRIMARY, themes } from "@shared/theme/tokens";
import { ErrorState } from "@shared/ui/ErrorState";
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark ? themes.dark : themes.light;
  const storeCurrency = useUserStore((state) => state.currency);
  const baseCurrency = storeCurrency || "PKR";
  const { confirm, alert } = usePrompt();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedAccount, setSelectedAccount] =
    useState<AccountWithBalance | null>(null);
  const submittingRef = useRef(false);

  // Queries & Mutations
  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAccountsWithBalancesQuery();
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation();
  const deleteMutation = useDeleteAccountMutation();
  const setDefaultMutation = useSetDefaultAccountMutation();

  const totalBalance = useMemo(
    () =>
      sumMoney(
        accounts
          .filter((a) => (a.currency || baseCurrency) === baseCurrency)
          .map((a) => Number(a.balance)),
      ),
    [accounts, baseCurrency],
  );

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
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      if (modalMode === "create") {
        await createMutation.mutateAsync({
          name: payload.name,
          type: payload.type,
          currency: baseCurrency,
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
    } catch (err: unknown) {
      await alert({
        title: "Could Not Save Account",
        message: getErrorMessage(
          err,
          "Failed to save account. Please try again.",
        ),
        variant: "warning",
      });
    } finally {
      submittingRef.current = false;
    }
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
        "Are you sure you want to delete this account? All associated ledger history for this account will be permanently removed.",
      variant: "danger",
      confirmText: "Delete account",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(acc.id);
    } catch (err: unknown) {
      await alert({
        title: "Delete Failed",
        message: getErrorMessage(
          err,
          "Failed to delete account. Please try again.",
        ),
        variant: "danger",
      });
    }
  };

  const handleSetDefault = async (acc: AccountWithBalance) => {
    if (acc.is_default) return;
    try {
      await setDefaultMutation.mutateAsync(acc.id);
    } catch (err: unknown) {
      await alert({
        title: "Action Failed",
        message: getErrorMessage(err, "Unable to set primary account."),
        variant: "warning",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* 1. Header Navigation */}
      <Animated.View
        entering={FadeInDown.duration(260)}
        className="flex-row items-center justify-between px-6 pt-3 pb-3"
      >
        <View>
          <Text className="text-xl font-black text-ink tracking-tight">
            Accounts & Cards
          </Text>
          <Text className="text-[11px] font-semibold text-ink-muted">
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"} active
          </Text>
        </View>

        <Pressable
          onPress={handleOpenAddModal}
          accessibilityRole="button"
          accessibilityLabel="Add new account"
          className="h-10 px-4 rounded-full bg-primary flex-row items-center gap-1.5 shadow-xs active:scale-95"
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">Add</Text>
        </Pressable>
      </Animated.View>

      {/* 2. Total Balance Banner */}
      <Animated.View entering={FadeInDown.duration(320).delay(40)}>
        <AccountTotalBanner
          totalBalance={totalBalance}
          accountsCount={accounts.length}
          currency={baseCurrency}
        />
      </Animated.View>

      {/* 3. Filter Chips */}
      <Animated.View entering={FadeInDown.duration(320).delay(80)}>
        <AccountFilterChips
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
        />
      </Animated.View>

      {/* 4. Accounts Cards List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : isError ? (
        <ErrorState
          title="Could not load accounts"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : (
        <FlatList
          data={filteredAccounts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: 120,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Animated.View
              entering={FadeInDown.duration(320)}
              className="py-20 items-center"
            >
              <View className="w-16 h-16 rounded-3xl bg-surface items-center justify-center border border-surface-border mb-3 shadow-xs">
                <Ionicons
                  name="wallet-outline"
                  size={28}
                  color={palette.textTertiary}
                />
              </View>
              <Text className="text-base font-bold text-ink">
                No accounts found
              </Text>
              <Text className="text-xs text-ink-muted text-center mt-1 max-w-[220px]">
                Tap 'Add' in the top corner to set up an account.
              </Text>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.duration(300).delay(Math.min(index * 45, 220))}
              layout={LinearTransition.springify().damping(20).stiffness(180)}
            >
              <AccountCard
                account={item}
                storeCurrency={baseCurrency}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteAccount}
                onSetDefault={handleSetDefault}
              />
            </Animated.View>
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

