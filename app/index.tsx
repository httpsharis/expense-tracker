// app/index.tsx
import { useAuth } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isLoaded) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#121316",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator color="#FFFFFF" />
        </View>
      );
    }

    if (isSignedIn) {
      router.replace("/(root)/(tabs)");
    } else {
      router.replace("/(auth)/SignUp");
    }
  }, [isLoaded, isSignedIn]);
  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)" />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#121316",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator color="#FFFFFF" />
    </View>
  );
  return <Redirect href="/(auth)/SignUp" />;
}
