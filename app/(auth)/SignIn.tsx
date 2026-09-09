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
  const logoColor = isDark ? "#E4E4E7" : "#18181B";

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
    } catch (err: any) {
      setSubmitting(false);
      const clerkErr = err?.errors?.[0];
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
    <SafeAreaView
      className="flex-1 bg-[#F8F8F6] dark:bg-[#121316]"
      edges={["top", "bottom"]}
    >
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
          <SaldoLogo size={64} color={logoColor} className="mb-5" />

          <Text className="text-2xl font-semibold text-center text-zinc-900 dark:text-zinc-100 tracking-tight">
            Welcome back
          </Text>

          <Text className="text-sm text-center text-zinc-500 dark:text-zinc-400 mt-1.5 mb-7">
            Enter your credentials to access your ledger
          </Text>

          <View className="w-full gap-3">
            {/* Inline Visual Error Banner */}
            {authError && (
              <View className="w-full p-3.5 rounded-[12px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex-row items-start gap-3 mb-1">
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={isDark ? "#FB7185" : "#E11D48"}
                  style={{ marginTop: 1 }}
                />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                    {authError.title}
                  </Text>
                  <Text className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                    {authError.message}
                  </Text>

                  {authError.action === "signup" && (
                    <TouchableOpacity
                      onPress={() => router.replace("/(auth)/SignUp")}
                      className="mt-2"
                    >
                      <Text className="text-xs font-semibold text-rose-900 dark:text-rose-100 underline">
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
              <Text className="text-xs text-rose-500 dark:text-rose-400 font-medium text-left px-1 mt-0.5">
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
              <View className="flex-1 h-[1px] bg-zinc-200/90 dark:bg-zinc-800/80" />
              <Text className="mx-3 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
                or
              </Text>
              <View className="flex-1 h-[1px] bg-zinc-200/90 dark:bg-zinc-800/80" />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={signInWithGoogle}
              disabled={isGoogleAuth || submitting}
              className="w-full h-12 rounded-[10px] flex-row items-center justify-center gap-3 border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-[#1A1B1E] active:opacity-70"
            >
              {isGoogleAuth ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#E4E4E7" : "#18181B"}
                />
              ) : (
                <>
                  <AntDesign name="google" size={18} color="#EA4335" />
                  <Text className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200">
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
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Don't have an account?{" "}
              <Text className="font-semibold text-zinc-800 dark:text-zinc-200 underline">
                Sign up
              </Text>
            </Text>
          </TouchableOpacity>

          <Text className="text-[11px] text-center text-zinc-400 dark:text-zinc-500 mt-6 px-4">
            By continuing, you agree to Saldo's Terms of Service and Privacy
            Policy.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
