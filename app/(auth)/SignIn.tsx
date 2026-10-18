import { useClerk, useSignIn } from "@clerk/expo";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { useGoogleAuth } from "@shared/lib/useGoogleAuth";
import { Button } from "@shared/ui/Button";
import { SaldoLogo } from "@shared/ui/Logo";
import { TextField } from "@shared/ui/TextField";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInSchema = z.infer<typeof signInSchema>;

export default function SignIn() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();
  const { signInWithGoogle, isAuthenticating: isGoogleAuth } = useGoogleAuth();

  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<{
    title: string;
    message: string;
    action?: "signup" | "google";
  } | null>(null);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const onSignInSubmit = async (data: SignInSchema) => {
    if (!signIn) return;
    setSubmitting(true);
    setAuthError(null);

    // Normalize email input
    const normalizedEmail = data.email.trim().toLowerCase();

    try {
      const response = await signIn.create({
        identifier: normalizedEmail,
        password: data.password,
      });

      if ("error" in response && response.error) {
        setSubmitting(false);
        setAuthError({
          title: "Sign In Error",
          message: response.error.message || "Invalid credentials provided.",
        });
        return;
      }

      if (signIn.status === "complete" && signIn.createdSessionId) {
        await setActive({ session: signIn.createdSessionId });
        setSubmitting(false);
        router.replace("/(root)/(tabs)");
      } else {
        setSubmitting(false);
        setAuthError({
          title: "Verification Required",
          message: "Please complete account verification to sign in.",
        });
      }
    } catch (err: unknown) {
      setSubmitting(false);
      const clerkErr =
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray((err as { errors?: unknown[] }).errors)
          ? (
              err as {
                errors: Array<{
                  code?: string;
                  longMessage?: string;
                  message?: string;
                }>;
              }
            ).errors[0]
          : undefined;
      const code = clerkErr?.code;

      if (
        code === "form_identifier_not_found" ||
        code === "identifier_invalid"
      ) {
        setAuthError({
          title: "Account Not Found",
          message: "No account exists for this email address.",
          action: "signup",
        });
        return;
      }

      if (code === "form_password_incorrect") {
        setAuthError({
          title: "Incorrect Password",
          message: "The password you entered does not match our records.",
        });
        return;
      }

      setAuthError({
        title: "Authentication Failed",
        message:
          clerkErr?.longMessage ||
          clerkErr?.message ||
          "Unable to log in with these credentials.",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top", "bottom"]}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 20,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-sm items-center">
          <SaldoLogo size={60} color="#22C55E" className="mb-4" />

          <Text className="text-2xl font-black text-center text-ink tracking-tight">
            Welcome back
          </Text>

          <Text className="text-sm font-medium text-center text-ink-muted mt-1.5 mb-7">
            Enter your credentials to access your ledger
          </Text>

          <View className="w-full gap-3">
            {/* Inline Visual Error Banner */}
            {authError && (
              <View className="w-full p-4 rounded-2xl bg-coral/10 border border-coral/30 flex-row items-start gap-3 mb-1">
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#EF4444"
                  style={{ marginTop: 1 }}
                />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-coral">
                    {authError.title}
                  </Text>
                  <Text className="text-xs text-coral mt-0.5 leading-relaxed">
                    {authError.message}
                  </Text>

                  {authError.action === "signup" && (
                    <TouchableOpacity
                      onPress={() => router.replace("/(auth)/SignUp")}
                      className="mt-2"
                    >
                      <Text className="text-xs font-bold text-coral underline">
                        Register this email address →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField
                  value={value}
                  onChangeText={(val) => {
                    if (authError) setAuthError(null);
                    onChange(val);
                  }}
                  onBlur={onBlur}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField
                  value={value}
                  onChangeText={(val) => {
                    if (authError) setAuthError(null);
                    onChange(val);
                  }}
                  onBlur={onBlur}
                  placeholder="Password"
                  secureTextEntry
                />
              )}
            />

            {(errors.email || errors.password) && (
              <Text className="text-xs text-coral font-semibold text-left px-1 mt-0.5">
                {errors.email?.message || errors.password?.message}
              </Text>
            )}

            <Button
              label="Sign In"
              onPress={handleSubmit(onSignInSubmit)}
              loading={submitting}
              disabled={isGoogleAuth || submitting}
              className="mt-1"
            />

            <View className="flex-row items-center w-full my-3">
              <View className="flex-1 h-[1px] bg-surface-border" />
              <Text className="mx-3 text-[11px] uppercase tracking-wider text-ink-whisper font-bold">
                or
              </Text>
              <View className="flex-1 h-[1px] bg-surface-border" />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={signInWithGoogle}
              disabled={isGoogleAuth || submitting}
              className="w-full h-14 rounded-2xl flex-row items-center justify-center gap-3 border border-surface-border bg-surface active:scale-98 shadow-2xs"
            >
              {isGoogleAuth ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#FFFFFF" : "#0A0A0B"}
                />
              ) : (
                <>
                  <AntDesign name="google" size={18} color="#EA4335" />
                  <Text className="text-[15px] font-bold text-ink">
                    Sign in with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            className="mt-6"
            onPress={() => router.replace("/(auth)/SignUp")}
          >
            <Text className="text-sm font-medium text-ink-muted">
              Don't have an account?{" "}
              <Text className="font-bold text-ink underline">
                Sign up
              </Text>
            </Text>
          </TouchableOpacity>

          <Text className="text-[11px] text-center text-ink-whisper mt-6 px-4">
            By continuing, you agree to Saldo's Terms of Service and Privacy
            Policy.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
