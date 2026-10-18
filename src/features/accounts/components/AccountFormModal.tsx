import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import { getErrorMessage } from "@shared/lib/errors";
import { fromMinorUnits, subtractMoney, toMinorUnits } from "@shared/lib/money";
import { ACCOUNT_CONFIGS, AccountFormModalProps, AccountType } from "../types";

export function AccountFormModal({
  visible,
  mode,
  account,
  accountsCount,
  storeCurrency = "PKR",
  onClose,
  onSave,
  onDelete,
  isSaving,
}: AccountFormModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("bank");
  const [isDefault, setIsDefault] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [formError, setFormError] = useState("");
  const submittingRef = useRef(false);

  // Sync state whenever modal opens or active account changes
  useEffect(() => {
    if (visible) {
      setFormError("");
      if (mode === "edit" && account) {
        setAccountName(account.name);
        setAccountType(account.type as AccountType);
        setIsDefault(account.is_default);
        setBalanceInput(String(account.balance ?? 0));
      } else {
        setAccountName("");
        setAccountType("bank");
        setIsDefault(accountsCount === 0);
        setBalanceInput("");
      }
    }
  }, [visible, mode, account, accountsCount]);

  const handleBalanceChange = (val: string) => {
    // Allow digits and at most one decimal separator
    const sanitized = val.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) {
      setBalanceInput(`${parts[0]}.${parts.slice(1).join("")}`);
    } else {
      setBalanceInput(sanitized);
    }
  };

  const handleSave = async () => {
    if (submittingRef.current || isSaving) return;
    const trimmed = accountName.trim();
    if (!trimmed) {
      setFormError("Enter an account name.");
      return;
    }

    submittingRef.current = true;
    try {
      if (mode === "create") {
        const parsedInitial = balanceInput.trim()
          ? parseFloat(balanceInput)
          : 0;
        const initialBalance = isNaN(parsedInitial)
          ? 0
          : fromMinorUnits(toMinorUnits(parsedInitial));

        await onSave({
          name: trimmed,
          type: accountType,
          isDefault,
          initialBalance,
        });
      } else if (mode === "edit" && account) {
        const parsedNewBalance = balanceInput.trim()
          ? parseFloat(balanceInput)
          : account.balance;
        const currentBalance = account.balance || 0;
        const delta = isNaN(parsedNewBalance)
          ? 0
          : subtractMoney(parsedNewBalance, currentBalance);

        await onSave({
          name: trimmed,
          type: accountType,
          isDefault,
          balanceAdjustmentDelta: delta,
        });
      }
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, "Failed to save account."));
    } finally {
      submittingRef.current = false;
    }
  };

  // Compute live delta for edit mode in integer minor units
  const balanceDelta =
    mode === "edit" && account && balanceInput.trim() !== ""
      ? subtractMoney(parseFloat(balanceInput) || 0, account.balance || 0)
      : 0;

  const displayCurrency = account?.currency || storeCurrency || "PKR";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-[#F8F9FB] dark:bg-[#090D16]">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          {/* Modal Navigation Header */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-[#E4E7EC] dark:border-zinc-800 bg-white dark:bg-[#161B26]">
            <Text className="text-base font-bold text-[#090D16] dark:text-white">
              {mode === "create"
                ? "Add new account"
                : `Edit "${account?.name}"`}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close form"
              className="w-8 h-8 rounded-full bg-[#F4F5F7] dark:bg-zinc-800 items-center justify-center active:bg-gray-200 dark:active:bg-zinc-700"
            >
              <Feather name="x" size={16} color={isDark ? "#FFFFFF" : "#090D16"} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 p-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className="gap-5">
              {/* 1. Account Name Input */}
              <View>
                <Text className="text-xs font-semibold text-[#525866] dark:text-zinc-400 mb-2">
                  Account name
                </Text>
                <TextInput
                  value={accountName}
                  onChangeText={(val) => {
                    setFormError("");
                    setAccountName(val);
                  }}
                  placeholder="e.g. Salary Bank, Cash in Hand, Easypaisa"
                  placeholderTextColor="#94A3B8"
                  className="h-12 px-4 rounded-2xl bg-white dark:bg-[#161B26] border border-[#E4E7EC] dark:border-zinc-800 text-sm font-semibold text-[#090D16] dark:text-white"
                  autoFocus={mode === "create"}
                />
              </View>

              {/* 2. Balance Input (Initial Balance or Balance Adjustment) */}
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-semibold text-[#525866] dark:text-zinc-400">
                    {mode === "create"
                      ? "Starting balance (optional)"
                      : "Adjust balance"}
                  </Text>
                  {mode === "edit" && Math.abs(balanceDelta) >= 0.01 && (
                    <Text
                      className={`text-[11px] font-semibold tabular-nums ${
                        balanceDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {balanceDelta > 0
                        ? `+${balanceDelta.toFixed(2)}`
                        : `${balanceDelta.toFixed(2)}`}{" "}
                      adjustment
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center h-12 px-4 rounded-2xl bg-white dark:bg-[#161B26] border border-[#E4E7EC] dark:border-zinc-800">
                  <Text className="text-xs font-bold text-[#64748B] dark:text-zinc-400 mr-2">
                    {displayCurrency}
                  </Text>
                  <TextInput
                    value={balanceInput}
                    onChangeText={handleBalanceChange}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-sm font-semibold text-[#090D16] dark:text-white"
                  />
                </View>
                <Text className="text-[11px] text-[#94A3B8] dark:text-zinc-500 mt-1.5">
                  {mode === "create"
                    ? "Enter the starting money in this account. Defaults to 0."
                    : "Changing this records an adjustment entry in your ledger."}
                </Text>
              </View>

              {/* 3. Account Type Selector */}
              <View>
                <Text className="text-xs font-semibold text-[#525866] dark:text-zinc-400 mb-2">
                  Account type
                </Text>
                <View className="gap-2">
                  {(Object.keys(ACCOUNT_CONFIGS) as AccountType[]).map(
                    (key) => {
                      const cfg = ACCOUNT_CONFIGS[key];
                      const isSelected = accountType === key;

                      return (
                        <Pressable
                          key={key}
                          onPress={() => setAccountType(key)}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${cfg.label}`}
                          className={`flex-row items-center justify-between p-3.5 rounded-2xl border active:scale-[0.99] ${
                            isSelected
                              ? "bg-[#090D16] dark:bg-zinc-100 border-[#090D16] dark:border-zinc-100"
                              : "bg-white dark:bg-[#161B26] border-[#E4E7EC] dark:border-zinc-800"
                          }`}
                        >
                          <View className="flex-row items-center gap-3">
                            <View
                              className={`w-9 h-9 rounded-xl items-center justify-center ${
                                isSelected ? "bg-white/10 dark:bg-black/10" : "bg-[#F4F5F7] dark:bg-zinc-800"
                              }`}
                            >
                              <Ionicons
                                name={cfg.icon}
                                size={18}
                                color={isSelected ? (isDark ? "#090D16" : cfg.accentColor) : (isDark ? "#E2E8F0" : "#090D16")}
                              />
                            </View>
                            <Text
                              className={`text-sm font-bold ${
                                isSelected ? "text-white dark:text-zinc-950" : "text-[#090D16] dark:text-white"
                              }`}
                            >
                              {cfg.label}
                            </Text>
                          </View>

                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={isDark ? "#16A34A" : "#D4F938"}
                            />
                          )}
                        </Pressable>
                      );
                    },
                  )}
                </View>
              </View>

              {/* 4. Primary Account Toggle */}
              <Pressable
                onPress={() => setIsDefault(!isDefault)}
                className="flex-row items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#161B26] border border-[#E4E7EC] dark:border-zinc-800 active:bg-[#F9FAFC] dark:active:bg-zinc-800/60"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-bold text-[#090D16] dark:text-white">
                    Set as primary account
                  </Text>
                  <Text className="text-xs text-[#64748B] dark:text-zinc-400 mt-0.5">
                    New transactions will automatically log to this account.
                  </Text>
                </View>
                <Ionicons
                  name={isDefault ? "checkbox" : "square-outline"}
                  size={22}
                  color={isDefault ? (isDark ? "#D4F938" : "#090D16") : "#94A3B8"}
                />
              </Pressable>

              {formError ? (
                <Text className="text-xs font-semibold text-rose-600">
                  {formError}
                </Text>
              ) : null}

              {/* 5. Save CTA Button */}
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Confirm save account"
                className="w-full h-14 bg-[#090D16] dark:bg-zinc-100 rounded-2xl items-center justify-center active:opacity-85 mt-1 shadow-sm"
              >
                {isSaving ? (
                  <ActivityIndicator color={isDark ? "#090D16" : "#FFFFFF"} />
                ) : (
                  <Text className="text-sm font-bold text-white dark:text-zinc-950">
                    {mode === "create" ? "Create account" : "Save changes"}
                  </Text>
                )}
              </Pressable>

              {/* 6. Delete Action in Edit Mode */}
              {mode === "edit" && account && onDelete && (
                <Pressable
                  onPress={() => onDelete(account)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this account"
                  className="w-full h-12 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 flex-row items-center justify-center gap-2 active:bg-rose-100 dark:active:bg-rose-900/40 mt-2 mb-6"
                >
                  <Feather name="trash-2" size={15} color="#E11D48" />
                  <Text className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    Delete account
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
