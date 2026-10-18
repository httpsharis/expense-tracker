import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ALL_CATEGORY_ICONS,
  CATEGORY_ICON_SECTIONS,
  CategoryIconItem,
  searchCategoryIcons,
} from "@shared/constants/categoryIcons";

export interface CategoryIconPickerModalProps {
  visible: boolean;
  selectedIcon?: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

const TAB_CATEGORIES = [
  "All",
  ...CATEGORY_ICON_SECTIONS.map((s) => s.category),
];

export function CategoryIconPickerModal({
  visible,
  selectedIcon,
  onSelect,
  onClose,
}: CategoryIconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const filteredIcons = useMemo(() => {
    let result: CategoryIconItem[] = ALL_CATEGORY_ICONS;

    if (searchQuery.trim()) {
      result = searchCategoryIcons(searchQuery);
    } else if (activeTab !== "All") {
      result =
        CATEGORY_ICON_SECTIONS.find((s) => s.category === activeTab)?.icons ??
        ALL_CATEGORY_ICONS;
    }

    return result;
  }, [searchQuery, activeTab]);

  const handleSelect = (iconName: string) => {
    onSelect(iconName);
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
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-border bg-surface">
          <View>
            <Text className="text-base font-extrabold text-ink tracking-tight">
              Category Icon Library
            </Text>
            <Text className="text-xs text-ink-muted mt-0.5">
              Select a vector icon for this category
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close icon picker"
            className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
          >
            <Feather name="x" size={18} color="#6B6B6E" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="px-5 pt-3 pb-2 bg-surface border-b border-surface-divider">
          <View className="h-11 px-3.5 rounded-2xl bg-surface-muted border border-surface-border flex-row items-center gap-2.5">
            <Feather name="search" size={16} color="#A0A0A3" />
            <TextInput
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text && activeTab !== "All") setActiveTab("All");
              }}
              placeholder="Search icons (food, fuel, gym, bill...)"
              placeholderTextColor="#A0A0A3"
              returnKeyType="search"
              clearButtonMode="while-editing"
              className="flex-1 text-xs font-semibold text-ink"
            />
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                className="p-1"
              >
                <Feather name="x-circle" size={15} color="#A0A0A3" />
              </Pressable>
            ) : null}
          </View>

          {/* Section Category Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="py-2.5"
            contentContainerStyle={{ gap: 8, paddingRight: 10 }}
          >
            {TAB_CATEGORIES.map((tab) => {
              const isSelected = activeTab === tab && !searchQuery.trim();
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setSearchQuery("");
                    setActiveTab(tab);
                  }}
                  className={`px-3 py-1.5 rounded-xl border active:scale-95 ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "bg-surface-muted border-surface-border"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? "text-white" : "text-ink-muted"
                    }`}
                  >
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Icons Grid */}
        <FlatList
          data={filteredIcons}
          keyExtractor={(item) => item.name}
          numColumns={4}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            paddingBottom: 40,
          }}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-16 items-center justify-center">
              <Ionicons name="search-outline" size={40} color="#A0A0A3" />
              <Text className="text-sm font-bold text-ink mt-3">
                No matching icons found
              </Text>
              <Text className="text-xs text-ink-muted mt-1 text-center px-8">
                Try searching for broader keywords like food, car, or home.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIcon === item.name;
            return (
              <Pressable
                onPress={() => handleSelect(item.name)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.label} icon`}
                className={`flex-1 aspect-square rounded-2xl items-center justify-center p-2 border active:scale-95 ${
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "bg-surface border-surface-border"
                }`}
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mb-1.5 ${
                    isSelected ? "bg-primary/20" : "bg-surface-muted"
                  }`}
                >
                  <Ionicons
                    name={item.name}
                    size={22}
                    color={isSelected ? "#22C55E" : "#52525B"}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  className={`text-[10px] text-center font-bold tracking-tight ${
                    isSelected ? "text-primary" : "text-ink-muted"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

