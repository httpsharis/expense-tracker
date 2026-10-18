import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const activeColor = "#0F172A";
  const inactiveColor = "#94A3B8";

  const handleActionSelect = (route: string) => {
    setQuickActionsVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            marginTop: -2,
            letterSpacing: -0.2,
          },
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: "#F1F5F9",
            borderTopWidth: 1,
            height: 58 + Math.max(insets.bottom, 8),
            paddingBottom: Math.max(insets.bottom, 6),
            paddingTop: 6,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="Transactions"
          options={{
            title: "Statistic",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "stats-chart" : "stats-chart-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        {/* Center Catalyst Button: Triggers Quick Actions Modal */}
        <Tabs.Screen
          name="AddTransactions"
          options={{
            title: "",
            tabBarIcon: () => (
              <View className="w-12 h-12 rounded-2xl items-center justify-center bg-[#D4F938] shadow-sm shadow-[#D4F938]/40">
                <Ionicons name="add" size={28} color="#0F172A" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setQuickActionsVisible(true);
            },
          }}
        />

        <Tabs.Screen
          name="budgets"
          options={{
            title: "Budgets",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "pie-chart" : "pie-chart-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="Profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="Assistant"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Quick Actions Center Modal */}
      <Modal
        visible={quickActionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickActionsVisible(false)}
      >
        <Pressable
          onPress={() => setQuickActionsVisible(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 pb-10"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <View>
                <Text className="text-base font-extrabold text-[#0F172A]">
                  Quick Actions
                </Text>
                <Text className="text-xs text-[#94A3B8] mt-0.5">
                  Choose how you want to record or move funds
                </Text>
              </View>
              <Pressable
                onPress={() => setQuickActionsVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Feather name="x" size={16} color="#64748B" />
              </Pressable>
            </View>

            {/* Quick Action Options Grid */}
            <View className="mt-4 gap-2.5">
              {/* 1. Manual Entry */}
              <Pressable
                onPress={() =>
                  handleActionSelect("/(root)/(tabs)/AddTransactions")
                }
                className="flex-row items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-gray-100 active:bg-gray-100"
              >
                <View className="flex-row items-center gap-3.5">
                  <View className="w-11 h-11 rounded-xl bg-amber-50 items-center justify-center">
                    <Ionicons name="keypad-outline" size={22} color="#D97706" />
                  </View>
                  <View>
                    <Text className="text-sm font-extrabold text-[#0F172A]">
                      Manual Keypad Entry
                    </Text>
                    <Text className="text-xs text-[#64748B] mt-0.5">
                      Fast 3x4 tactile keypad with preset chips
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </Pressable>

              {/* 2. Scan Receipt */}
              <Pressable
                onPress={() =>
                  handleActionSelect("/(root)/(tabs)/AddTransactions")
                }
                className="flex-row items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-gray-100 active:bg-gray-100"
              >
                <View className="flex-row items-center gap-3.5">
                  <View className="w-11 h-11 rounded-xl bg-sky-50 items-center justify-center">
                    <Ionicons name="scan-outline" size={22} color="#0284C7" />
                  </View>
                  <View>
                    <Text className="text-sm font-extrabold text-[#0F172A]">
                      Scan Receipt / Bill
                    </Text>
                    <Text className="text-xs text-[#64748B] mt-0.5">
                      Extract items and total using AI vision
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </Pressable>

              {/* 3. Voice Logger */}
              <Pressable
                onPress={() => handleActionSelect("/(root)/(tabs)/Assistant")}
                className="flex-row items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-gray-100 active:bg-gray-100"
              >
                <View className="flex-row items-center gap-3.5">
                  <View className="w-11 h-11 rounded-xl bg-purple-50 items-center justify-center">
                    <Ionicons name="mic-outline" size={22} color="#9333EA" />
                  </View>
                  <View>
                    <Text className="text-sm font-extrabold text-[#0F172A]">
                      AI Voice Logger
                    </Text>
                    <Text className="text-xs text-[#64748B] mt-0.5">
                      Say "Spent 500 on coffee" to log instantly
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </Pressable>

              {/* 4. Add Expense (Electric Lime Catalyst) */}
              <Pressable
                onPress={() =>
                  handleActionSelect("/(root)/(tabs)/AddTransactions")
                }
                className="flex-row items-center justify-between p-4 rounded-2xl bg-[#D4F938]/20 border border-[#D4F938] active:bg-[#D4F938]/30"
              >
                <View className="flex-row items-center gap-3.5">
                  <View className="w-11 h-11 rounded-xl bg-[#0F172A] items-center justify-center shadow-xs">
                    <Feather name="plus" size={22} color="#D4F938" />
                  </View>
                  <View>
                    <Text className="text-sm font-extrabold text-[#0F172A]">
                      Add New Expense
                    </Text>
                    <Text className="text-xs text-[#64748B] mt-0.5">
                      Log a purchase, bill, or daily spending
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#0F172A" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
