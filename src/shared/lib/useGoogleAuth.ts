import { useOAuth } from "@clerk/expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { usePromptStore } from "@store/promptStore";

// Completes the in-app browser redirect loop cleanly
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Warms up the system browser to prevent handshake timeout
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      // 1. Generate the native app redirect URL
      const redirectUrl = Linking.createURL("/(root)/(tabs)", {
        scheme: "saldo",
      });

      // 2. Open the system browser
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      if (code !== "ERR_REQUEST_CANCELED") {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to complete Google sign-in.";
        void usePromptStore.getState().alert({
          title: "Google Sign-In Error",
          message,
          variant: "danger",
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [startOAuthFlow]);

  return { signInWithGoogle, isAuthenticating };
}