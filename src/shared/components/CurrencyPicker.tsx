import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import cc from "currency-codes";
import { useMemo, useState } from "react";
import {
    FlatList,
    Modal,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrencySymbol } from "../lib/currency";

export type CurrencyEntry = {
  code: string;
  name: string;
  symbol: string;
};

const IGNORED_CODES = new Set([
  "XXX",
  "XTS",
  "XAU",
  "XAG",
  "XPD",
  "XPT",
  "XBA",
  "XBB",
  "XBC",
  "XBD",
  "XSU",
  "XDR",
  "XUA",
]);

const STATIC_SYMBOL_MAP: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "Rs",
  INR: "₹",
  AED: "AED",
  SAR: "SR",
  CAD: "CA$",
  AUD: "AU$",
  JPY: "¥",
  CNY: "¥",
  CHF: "CHF",
  TRY: "₺",
  BRL: "R$",
  ZAR: "R",
  SGD: "S$",
  NZD: "NZ$",
  HKD: "HK$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  KRW: "₩",
  RUB: "₽",
  MXN: "$",
  THB: "฿",
  MYR: "RM",
  PHP: "₱",
  IDR: "Rp",
  VND: "₫",
  EGP: "E£",
  NGN: "₦",
  KES: "KSh",
  BDT: "৳",
  KWD: "KD",
  BHD: "BD",
  OMR: "RO",
  QAR: "QR",
};

const POPULAR_CODES = ["USD", "EUR", "GBP", "PKR", "INR", "AED", "CAD", "AUD"];

export const ALL_CURRENCIES: CurrencyEntry[] = cc
  .codes()
  .filter((code) => !IGNORED_CODES.has(code))
  .map((code) => ({
    code,
    name: cc.code(code)?.currency ?? code,
    symbol: STATIC_SYMBOL_MAP[code] || getCurrencySymbol(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const POPULAR_CURRENCIES: CurrencyEntry[] = POPULAR_CODES.map((code) =>
  ALL_CURRENCIES.find((c) => c.code === code),
).filter((c): c is CurrencyEntry => Boolean(c));

interface CurrencyPickerProps {
  visible: boolean;
  selectedCode: string;
  onSelect: (currency: CurrencyEntry) => void;
  onClose: () => void;
}

export function CurrencyPicker({
  visible,
  selectedCode,
  onSelect,
  onClose,
}: CurrencyPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ALL_CURRENCIES;
    return ALL_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = (item: CurrencyEntry) => {
    onSelect(item);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-canvas">
        {/* Grabber indicator */}
        <View className="items-center pt-2 pb-1">
          <View className="w-10 h-1 rounded-full bg-surface-border" />
        </View>

        {/* Top Header */}
        <View className="flex-row items-center justify-between px-6 pt-3 pb-3">
          <View>
            <Text className="text-xl font-bold tracking-tight text-ink">
              Currencies
            </Text>
            <Text className="text-xs text-ink-muted mt-0.5">
              Select your active ledger denomination
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:opacity-60"
          >
            <Feather name="x" size={16} color="#6B6B6E" />
          </Pressable>
        </View>

        {/* Minimalist Search Input */}
        <View className="px-6 py-2">
          <View className="flex-row items-center bg-surface border border-surface-border rounded-2xl px-3.5 h-11">
            <Ionicons name="search" size={16} color="#6B6B6E" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by code, country, or symbol"
              placeholderTextColor="#A0A0A3"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              className="flex-1 ml-2 text-sm text-ink p-0"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#A0A0A3" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Popular Quick-Select Chips (hidden during active search) */}
        {!query && (
          <View className="px-6 pt-3 pb-2">
            <Text className="text-[11px] font-semibold tracking-wider text-ink-whisper uppercase mb-2">
              Popular
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {POPULAR_CURRENCIES.map((item) => {
                const isSelected = item.code === selectedCode;
                return (
                  <Pressable
                    key={item.code}
                    onPress={() => handleSelect(item)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-surface border-surface-border"
                    } active:opacity-75`}
                  >
                    <Text
                      className={`text-xs font-bold mr-1.5 ${
                        isSelected
                          ? "text-white"
                          : "text-ink"
                      }`}
                    >
                      {item.code}
                    </Text>
                    <Text
                      className={`text-[11px] ${
                        isSelected
                          ? "text-white/80"
                          : "text-ink-muted"
                      }`}
                    >
                      {item.symbol}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Continuous Inset List */}
        <View className="flex-1 px-6 pt-2">
          {!query && (
            <Text className="text-[11px] font-semibold tracking-wider text-ink-whisper uppercase mb-2">
              All Currencies
            </Text>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <View className="py-16 items-center">
                <Text className="text-sm text-ink-muted">
                  No currencies match &quot;{query}&quot;
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = item.code === selectedCode;
              return (
                <Pressable
                  onPress={() => handleSelect(item)}
                  className="flex-row items-center justify-between py-3 active:opacity-60 border-b border-surface-divider"
                >
                  <View className="flex-row items-center gap-3.5 flex-1 min-w-0 mr-3">
                    {/* Minimal Monogram Symbol */}
                    <View
                      className={`h-9 min-w-[38px] px-2 rounded-xl border items-center justify-center ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "bg-surface-muted border-surface-border"
                      }`}
                    >
                      <Text
                        numberOfLines={1}
                        className={`font-semibold text-xs text-center ${
                          isSelected
                            ? "text-white font-bold"
                            : "text-ink"
                        }`}
                      >
                        {item.symbol}
                      </Text>
                    </View>

                    {/* Meta Stack */}
                    <View className="flex-1 min-w-0 justify-center">
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        className="text-sm font-semibold text-ink"
                      >
                        {item.name}
                      </Text>
                      <Text className="text-[11px] text-ink-muted font-medium mt-0.5">
                        {item.code}
                      </Text>
                    </View>
                  </View>

                  {/* Right Status */}
                  <View className="w-6 items-end justify-center shrink-0">
                    {isSelected && (
                      <Feather
                        name="check"
                        size={16}
                        color="#22C55E"
                      />
                    )}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
