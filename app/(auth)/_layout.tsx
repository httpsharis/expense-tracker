import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />; // Stack mean page stacked on top of other, like after sign up there is email verification.
}
