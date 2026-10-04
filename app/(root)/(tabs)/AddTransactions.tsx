import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatCurrency, getCurrencySymbol } from "@shared/lib/currency";
import {
    useAccountsWithBalancesQuery,
    useCategoriesQuery,
    useCreateTransactionMutation,
} from "@store/hooks";
import { usePrompt } from "@store/promptStore";
import { useUserStore } from "@store/userStore";

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000];

export default function AddTransactionsScreen() {
  const router = useRouter();
  const storeCurrency = useUserStore((state) => state.currency);
  const { alert } = usePrompt();

  // Data queries
  const { data: accounts = [] } = useAccountsWithBalancesQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const createTxMutation = useCreateTransactionMutation();

  // Form State
  const [txType, setTxType] = useState<"expense" | "income" | "transfer">(
    "expense",
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [amountStr, setAmountStr] = useState("0");

  // Modals
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);

  // Active account
  const currentAccount =
    accounts.find((a) => a.id === selectedAccountId) ??
    accounts.find((a) => a.is_default) ??
    accounts[0];

  // Active category
  const currentCategory = categories.find((c) => c.id === selectedCategoryId);

  // Account label
  const accountLabel = currentAccount
    ? `**** ${currentAccount.id.slice(-4)}`
    : "**** 3425";

  // Keypad click handlers
  const handleKeyPress = (val: string) => {
    if (val === ".") {
      if (!amountStr.includes(".")) {
        setAmountStr((prev) => prev + ".");
      }
      return;
    }

    if (amountStr === "0") {
      setAmountStr(val);
    } else {
      // Limit to 2 decimal places if decimal point exists
      const parts = amountStr.split(".");
      if (parts.length > 1 && parts[1].length >= 2) {
        return;
      }
      // Maximum length guard
      if (amountStr.replace(".", "").length >= 9) return;
      setAmountStr((prev) => prev + val);
    }
  };

  const handleBackspace = () => {
    if (amountStr.length <= 1) {
      setAmountStr("0");
    } else {
      setAmountStr((prev) => prev.slice(0, -1));
    }
  };

  const handlePresetSelect = (val: number) => {
    setAmountStr(val.toString());
  };

  // Submit transaction
  const handleSubmit = async () => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      await alert({
        title: "Invalid Amount",
        message: "Please enter an amount greater than 0.",
        variant: "warning",
      });
      return;
    }

    if (!currentAccount?.id) {
      await alert({
        title: "Account Required",
        message: "Please select an account for this transaction.",
        variant: "warning",
      });
      return;
    }

    try {
      await createTxMutation.mutateAsync({
        account_id: currentAccount.id,
        amount: numAmount,
        type: txType,
        category_id: selectedCategoryId || null,
        description:
          note.trim() ||
          currentCategory?.name ||
          (txType === "income" ? "Deposit" : "Payment"),
        status: "completed",
        input_method: "manual",
        date: new Date().toISOString(),
      });

      // Reset and navigate to Transactions tab
      setAmountStr("0");
      setNote("");
      router.replace("/(root)/(tabs)/Transactions" as any);
    } catch (err: any) {
      await alert({
        title: "Error Saving Transaction",
        message: err.message || "An unexpected error occurred.",
        variant: "warning",
      });
    }
  };

  // Active currency & symbol
  const activeCurrency = currentAccount?.currency || storeCurrency || "PKR";
  const currencySymbol = getCurrencySymbol(activeCurrency);

  // Formatted amount display
  const numericVal = parseFloat(amountStr) || 0;
  const displayAmount = amountStr.includes(".")
    ? `${currencySymbol} ${amountStr}`
    : formatCurrency(numericVal, activeCurrency);

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FB]" edges={["top"]}>
      {/* 1. Header Bar */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center shadow-xs active:scale-95"
        >
          <Feather name="arrow-left" size={18} color="#0F172A" />
        </Pressable>

        <Text className="text-base font-bold text-[#0F172A] tracking-tight">
          {txType === "income"
            ? "Add Income"
            : txType === "transfer"
              ? "Transfer Funds"
              : "Add Expense"}
        </Text>

        <Pressable
          onPress={() => setNoteModalOpen(true)}
          className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center shadow-xs active:scale-95"
        >
          <Feather name="edit-3" size={17} color="#0F172A" />
        </Pressable>
      </View>

      {/* 2. Type Selector Tabs (Expense / Income / Transfer) */}
      <View className="flex-row items-center justify-center px-6 mt-1">
        <View className="flex-row bg-[#ECEFF3] p-1 rounded-2xl">
          {(["expense", "income", "transfer"] as const).map((type) => {
            const isActive = txType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setTxType(type)}
                className={`px-4 py-1.5 rounded-xl ${
                  isActive ? "bg-white shadow-xs" : ""
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    isActive ? "text-[#0F172A]" : "text-[#64748B]"
                  }`}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 3. Account Selector Chip */}
      <View className="items-center mt-3">
        <Pressable
          onPress={() => setAccountModalOpen(true)}
          className="flex-row items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-100 shadow-xs active:opacity-75"
        >
          <View className="w-5 h-3.5 rounded-xs bg-[#D4F938] items-center justify-center">
            <View className="w-3 h-0.5 bg-[#0F172A] rounded-full" />
          </View>
          <Text className="text-xs font-semibold text-[#0F172A] tracking-wider">
            {accountLabel}
          </Text>
          <Feather name="chevron-down" size={14} color="#64748B" />
        </Pressable>
      </View>

      {/* 4. Hero Amount Section */}
      <View className="items-center justify-center my-3 px-6">
        <Text className="text-xs font-medium text-[#64748B] tracking-tight mb-1">
          Enter amount
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-4xl font-extrabold text-[#0F172A] tracking-tight tabular-nums"
        >
          {displayAmount}
        </Text>

        {/* Category & Note pills */}
        <View className="flex-row items-center gap-2 mt-2">
          <Pressable
            onPress={() => setCategoryModalOpen(true)}
            className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200/80 active:opacity-75"
          >
            <Ionicons name="pricetag-outline" size={12} color="#64748B" />
            <Text className="text-[11px] font-bold text-[#0F172A]">
              {currentCategory ? currentCategory.name : "Category"}
            </Text>
            <Feather name="chevron-down" size={11} color="#64748B" />
          </Pressable>

          {note ? (
            <Pressable
              onPress={() => setNoteModalOpen(true)}
              className="px-3 py-1 rounded-full bg-[#D4F938]/30 border border-[#D4F938] active:opacity-75"
            >
              <Text
                className="text-[11px] font-semibold text-[#0F172A]"
                numberOfLines={1}
              >
                "{note}"
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 5. Preset Amount Chips ($50, $100, $500, etc.) */}
      <View className="px-6 mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, justifyContent: "center" }}
        >
          {PRESET_AMOUNTS.map((preset) => (
            <Pressable
              key={preset}
              onPress={() => handlePresetSelect(preset)}
              className={`px-4 py-1.5 rounded-full border active:scale-95 ${
                amountStr === preset.toString()
                  ? "bg-[#D4F938] border-[#D4F938]"
                  : "bg-white border-gray-100"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  amountStr === preset.toString()
                    ? "text-[#0F172A]"
                    : "text-[#64748B]"
                }`}
              >
                {formatCurrency(preset, activeCurrency, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 6. Tactile 3x4 Keypad Grid */}
      <View className="flex-1 justify-center px-8 py-1">
        <View className="gap-2">
          {/* Row 1 */}
          <View className="flex-row justify-between">
            {["1", "2", "3"].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleKeyPress(num)}
                className="w-20 h-14 rounded-2xl bg-white border border-gray-100 items-center justify-center shadow-xs active:bg-gray-100 active:scale-95"
              >
                <Text className="text-xl font-bold text-[#0F172A]">{num}</Text>
              </Pressable>
            ))}
          </View>

          {/* Row 2 */}
          <View className="flex-row justify-between">
            {["4", "5", "6"].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleKeyPress(num)}
                className="w-20 h-14 rounded-2xl bg-white border border-gray-100 items-center justify-center shadow-xs active:bg-gray-100 active:scale-95"
              >
                <Text className="text-xl font-bold text-[#0F172A]">{num}</Text>
              </Pressable>
            ))}
          </View>

          {/* Row 3 */}
          <View className="flex-row justify-between">
            {["7", "8", "9"].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleKeyPress(num)}
                className="w-20 h-14 rounded-2xl bg-white border border-gray-100 items-center justify-center shadow-xs active:bg-gray-100 active:scale-95"
              >
                <Text className="text-xl font-bold text-[#0F172A]">{num}</Text>
              </Pressable>
            ))}
          </View>

          {/* Row 4 */}
          <View className="flex-row justify-between">
            {/* Decimal */}
            <Pressable
              onPress={() => handleKeyPress(".")}
              className="w-20 h-14 rounded-2xl bg-white border border-gray-100 items-center justify-center shadow-xs active:bg-gray-100 active:scale-95"
            >
              <Text className="text-2xl font-bold text-[#0F172A]">.</Text>
            </Pressable>

            {/* Zero */}
            <Pressable
              onPress={() => handleKeyPress("0")}
              className="w-20 h-14 rounded-2xl bg-white border border-gray-100 items-center justify-center shadow-xs active:bg-gray-100 active:scale-95"
            >
              <Text className="text-xl font-bold text-[#0F172A]">0</Text>
            </Pressable>

            {/* Backspace */}
            <Pressable
              onPress={handleBackspace}
              className="w-20 h-14 rounded-2xl bg-white border border-gray-100 items-center justify-center shadow-xs active:bg-gray-100 active:scale-95"
            >
              <Ionicons name="backspace-outline" size={22} color="#0F172A" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* 7. Bottom CTA Button */}
      <View className="px-6 pb-6 pt-2">
        <Pressable
          onPress={handleSubmit}
          disabled={createTxMutation.isPending}
          className="w-full h-14 rounded-2xl bg-[#D4F938] items-center justify-center shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <Text className="text-base font-extrabold text-[#0F172A] tracking-tight">
            {createTxMutation.isPending
              ? "Saving..."
              : txType === "income"
                ? "Save Income"
                : txType === "transfer"
                  ? "Save Transfer"
                  : "Save Expense"}
          </Text>
        </Pressable>
      </View>

      {/* Account Selector Modal */}
      <Modal
        visible={accountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalOpen(false)}
      >
        <Pressable
          onPress={() => setAccountModalOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 pb-10 max-h-[70%]"
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <Text className="text-base font-bold text-[#0F172A]">
                Select Source Account
              </Text>
              <Pressable onPress={() => setAccountModalOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView className="mt-4">
              <View className="gap-2">
                {accounts.map((acc) => (
                  <Pressable
                    key={acc.id}
                    onPress={() => {
                      setSelectedAccountId(acc.id);
                      setAccountModalOpen(false);
                    }}
                    className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                      (selectedAccountId ?? currentAccount?.id) === acc.id
                        ? "border-[#D4F938] bg-[#D4F938]/10"
                        : "border-gray-100 bg-[#F8F9FB]"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-xl bg-white items-center justify-center shadow-xs">
                        <Ionicons
                          name="card-outline"
                          size={20}
                          color="#0F172A"
                        />
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-[#0F172A]">
                          {acc.name}
                        </Text>
                        <Text className="text-xs text-[#64748B] capitalize">
                          {acc.type} • {acc.currency}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm font-extrabold text-[#0F172A] tabular-nums">
                      {formatCurrency(acc.balance, acc.currency)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Category Selector Modal */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <Pressable
          onPress={() => setCategoryModalOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 pb-10 max-h-[70%]"
          >
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <Text className="text-base font-bold text-[#0F172A]">
                Select Category
              </Text>
              <Pressable
                onPress={() => setCategoryModalOpen(false)}
                hitSlop={8}
              >
                <Feather name="x" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView className="mt-4">
              <View className="flex-row flex-wrap gap-2.5">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        setCategoryModalOpen(false);
                      }}
                      className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl border ${
                        isSelected
                          ? "border-[#D4F938] bg-[#D4F938]/15"
                          : "border-gray-100 bg-[#F8F9FB]"
                      }`}
                    >
                      <Text className="text-sm">{cat.icon || "🏷️"}</Text>
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? "text-[#0F172A]" : "text-[#64748B]"
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Note / Description Modal */}
      <Modal
        visible={noteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalOpen(false)}
      >
        <Pressable
          onPress={() => setNoteModalOpen(false)}
          className="flex-1 bg-black/40 justify-center px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6"
          >
            <Text className="text-base font-bold text-[#0F172A] mb-3">
              Add Note / Merchant
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Starbucks, Grocery run, Salary"
              placeholderTextColor="#94A3B8"
              className="p-3.5 rounded-2xl bg-[#F8F9FB] border border-gray-100 text-sm font-medium text-[#0F172A]"
              autoFocus
            />
            <View className="flex-row justify-end gap-3 mt-4">
              <Pressable
                onPress={() => {
                  setNote("");
                  setNoteModalOpen(false);
                }}
                className="px-4 py-2"
              >
                <Text className="text-xs font-bold text-[#64748B]">Clear</Text>
              </Pressable>
              <Pressable
                onPress={() => setNoteModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#0F172A]"
              >
                <Text className="text-xs font-bold text-white">Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
