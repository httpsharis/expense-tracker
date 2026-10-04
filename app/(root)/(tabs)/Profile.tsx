import { useClerk, useUser } from "@clerk/expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "@shared/lib/errors";
import { useUserStore } from "../../../store/userStore";

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loggingOut, setLoggingOut] = useState(false);

  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "User";
  const email = user?.primaryEmailAddress?.emailAddress || "No email provided";
  const initials =
    (user?.firstName?.[0] || "U").toUpperCase() +
    (user?.lastName?.[0] || "").toUpperCase();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Saldo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
            useUserStore.getState().resetUserStore();
            router.replace("/(auth)/SignIn");
          } catch (err: unknown) {
            setLoggingOut(false);
            Alert.alert("Sign Out Error", getErrorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8F8F6] dark:bg-[#121316] px-6"
      edges={["top", "bottom"]}
    >
      {/* Top Header */}
      <View className="py-4">
        <Text className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Profile
        </Text>
      </View>

      {/* User Card */}
      <View className="flex-row items-center gap-4 p-4 rounded-[14px] bg-white dark:bg-[#1A1B1E] border border-zinc-200/90 dark:border-zinc-800/80 mb-6">
        <View className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-100 items-center justify-center">
          <Text className="text-base font-semibold text-white dark:text-zinc-900">
            {initials}
          </Text>
        </View>

        <View className="flex-1 justify-center">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {fullName}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {email}
          </Text>
        </View>
      </View>

      {/* Settings / Navigation List */}
      <View className="rounded-[14px] bg-white dark:bg-[#1A1B1E] border border-zinc-200/90 dark:border-zinc-800/80 overflow-hidden mb-6">
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-row items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800/50"
        >
          <View className="flex-row items-center gap-3">
            <Feather
              name="settings"
              size={18}
              color={isDark ? "#D4D4D8" : "#3F3F46"}
            />
            <Text className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Preferences
            </Text>
          </View>
          <Feather
            name="chevron-right"
            size={16}
            color={isDark ? "#71717A" : "#A1A1AA"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-row items-center justify-between px-4 py-3.5"
        >
          <View className="flex-row items-center gap-3">
            <Feather
              name="shield"
              size={18}
              color={isDark ? "#D4D4D8" : "#3F3F46"}
            />
            <Text className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Security
            </Text>
          </View>
          <Feather
            name="chevron-right"
            size={16}
            color={isDark ? "#71717A" : "#A1A1AA"}
          />
        </TouchableOpacity>
      </View>

      {/* Logout Action Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSignOut}
        disabled={loggingOut}
        className="w-full h-12 rounded-[10px] flex-row items-center justify-center gap-2 border border-rose-200 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/20 active:opacity-70"
      >
        {loggingOut ? (
          <ActivityIndicator size="small" color="#F43F5E" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color="#F43F5E" />
            <Text className="text-sm font-medium text-rose-600 dark:text-rose-400">
              Sign Out
            </Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
