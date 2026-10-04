import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

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

  return <Redirect href={isSignedIn ? "/(root)/(tabs)" : "/(auth)/SignIn"} />;
}
