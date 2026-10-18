import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AccountFilterChipsProps, FILTER_ITEMS } from "../types";

export function AccountFilterChips({
  activeFilter,
  onSelectFilter,
}: AccountFilterChipsProps) {
  return (
    <View className="py-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
      >
        {FILTER_ITEMS.map((item) => {
          const isActive = activeFilter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelectFilter(item.key)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${item.label}`}
              className={`px-4 py-2 rounded-full border active:scale-98 ${
                isActive
                  ? "bg-[#090D16] dark:bg-zinc-100 border-[#090D16] dark:border-zinc-100"
                  : "bg-white dark:bg-[#161B26] border-[#E4E7EC] dark:border-zinc-800"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? "text-white dark:text-zinc-950" : "text-[#525866] dark:text-zinc-400"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
