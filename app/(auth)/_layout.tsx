import { useAuth } from "@clerk/expo";
import { UniversalPromptModal } from "@shared/components";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)" />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <UniversalPromptModal />
    </>
  );
}
