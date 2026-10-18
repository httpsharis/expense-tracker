import { useAuth } from "@clerk/expo";
import { UniversalPromptModal } from "@shared/components";
import { useUserSync } from "@shared/hooks/useUserSync";
import { ErrorState } from "@shared/ui/ErrorState";
import { useUserStore } from "@store/userStore";
import { Redirect, Slot, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const needsOnboarding = useUserStore((state) => state.needsOnboarding);
  const pathname = usePathname();

  const { syncError, retrySync } = useUserSync();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/SignIn" />;
  }

  if (needsOnboarding === null) {
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        {syncError ? (
          <ErrorState
            title="Could not sync your profile"
            message={syncError}
            onRetry={retrySync}
          />
        ) : (
          <ActivityIndicator size="large" color="#22C55E" />
        )}
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

  return (
    <>
      <Slot />
      <UniversalPromptModal />
    </>
  );
}
