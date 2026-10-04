import { useAuth } from "@clerk/expo";
import { useUserSync } from "@shared/hooks/useUserSync";
import { Redirect, Slot, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useUserStore } from "../../store/userStore";

export default function RootLayout() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const needsOnboarding = useUserStore((state) => state.needsOnboarding);
  const setNeedsOnboarding = useUserStore((state) => state.setNeedsOnboarding);
  const pathname = usePathname();
  const [minLoadOne, setMinLoadDone] = useState(false);

  useUserSync();

  useEffect(() => {
    setNeedsOnboarding(null);
  }, [userId, setNeedsOnboarding]);

  useEffect(() => {
    const t = setTimeout(() => setMinLoadDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/SignIn" />;
  }

  if (!minLoadOne || needsOnboarding === null) {
    return (
      <View className="flex-1 bg-brand-body items-center justify-center">
        <ActivityIndicator size="large" color="#1A1D26" />
      </View>
    );
  }

  const isOnboardingRoute = pathname.toLowerCase().includes("onboarding");

  if (needsOnboarding && !isOnboardingRoute) {
    return <Redirect href="/(root)/Onboarding" />;
  }

  if (!needsOnboarding && isOnboardingRoute) {
    return <Redirect href="/(root)/(tabs)" />;
  }

  return <Slot />;
}
