import { useClerk, useSignUp } from "@clerk/expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@shared/ui/Button";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Alert,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { getErrorMessage } from "@shared/lib/errors";
import {
    codeSchema,
    SignUpSchema,
    signUpSchema,
} from "@shared/lib/schemas/auth";
import { SaldoLogo } from "@shared/ui/Logo";
import { TextField } from "@shared/ui/TextField";

export default function SignUp() {
  const { signUp } = useSignUp();
  const { setActive } = useClerk();
  const router = useRouter();

  const [pendingVerification, setPendingVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors: formErrors },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const {
    control: codeControl,
    handleSubmit: handleCodeSubmit,
    watch: watchCode,
    formState: { errors: codeErrors },
  } = useForm<{ code: string }>({
    resolver: zodResolver(codeSchema),
    mode: "onBlur",
    defaultValues: { code: "" },
  });

  const rawCode = watchCode("code") || "";
  // Balanced emblem tone: avoids blinding 100% white
  const logoColor = isDark ? "#E4E4E7" : "#18181B";

  const onSignUpSubmit = async (data: SignUpSchema) => {
    if (!signUp) return;
    setSubmitting(true);

    try {
      await signUp.create({
        emailAddress: data.email.trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });

      await signUp.verifications.sendEmailCode();

      setPendingVerification(true);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      Alert.alert("Sign Up Failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifySubmit = async ({ code }: { code: string }) => {
    if (!signUp) return;
    setSubmitting(true);

    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code });

      if (error) {
        Alert.alert(
          "Verification failed",
          error.message || "Invalid Verification Code.",
        );
        return;
      }

      if (signUp.status === "complete") {
        await setActive({ session: signUp.createdSessionId });
        setSubmitting(false);
        router.replace("/(root)/(tabs)");
      } else {
        setSubmitting(false);
        Alert.alert("Verification Complete", "Please check your code");
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      Alert.alert("Verification Failed", message);
    }
  };

  return (
    <SafeAreaView
      // Softer surface background: #121316 (dark) / #F8F8F6 (light)
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
          {/* Back Step Action */}
          {pendingVerification && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setPendingVerification(false)}
              className="flex-row items-center gap-1.5 self-start mb-4"
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={isDark ? "#A1A1AA" : "#71717A"}
              />
              <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Edit details
              </Text>
            </TouchableOpacity>
          )}

          {/* Top Brand Logo */}
          <SaldoLogo size={64} color={logoColor} className="mb-5" />

          {/* Headers */}
          <Text className="text-2xl font-semibold text-center text-zinc-900 dark:text-zinc-100 tracking-tight">
            {pendingVerification ? "Enter verification code" : "Create account"}
          </Text>

          <Text className="text-sm text-center text-zinc-500 dark:text-zinc-400 mt-1.5 mb-7">
            {pendingVerification
              ? `We sent a 6-digit code to ${getValues("email") || "your email"}`
              : "Start tracking your monthly ledger"}
          </Text>

          {/* STEP 1: Registration Form */}
          {!pendingVerification && (
            <View className="w-full gap-3">
              <View className="flex-row gap-3">
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <View className="flex-1">
                      <TextField
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="First name"
                        autoCapitalize="words"
                      />
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <View className="flex-1">
                      <TextField
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Last name"
                        autoCapitalize="words"
                      />
                    </View>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField
                    value={value}
                    onChangeText={onChange}
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
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Password"
                    secureTextEntry
                  />
                )}
              />

              {(formErrors.firstName ||
                formErrors.lastName ||
                formErrors.email ||
                formErrors.password) && (
                <Text className="text-xs text-rose-500 dark:text-rose-400 font-medium text-left px-1 mt-0.5">
                  {formErrors.firstName?.message ||
                    formErrors.lastName?.message ||
                    formErrors.email?.message ||
                    formErrors.password?.message}
                </Text>
              )}

              <Button
                label="Continue"
                onPress={handleSubmit(onSignUpSubmit)}
                loading={submitting}
                className="mt-2"
              />
            </View>
          )}

          {/* STEP 2: 6-Digit OTP Verification */}
          {pendingVerification && (
            <View className="w-full gap-4 items-center">
              {/* Invisible native text input handling keyboard input */}
              <Controller
                control={codeControl}
                name="code"
                render={({ field: { onChange, onBlur } }) => (
                  <TextInput
                    ref={codeInputRef}
                    value={rawCode}
                    onChangeText={(val: string) =>
                      onChange(val.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      height: 0,
                      width: 0,
                    }}
                  />
                )}
              />

              {/* Visual 6-slot digit display */}
              <Pressable
                onPress={() => codeInputRef.current?.focus()}
                className="flex-row justify-between w-full"
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = rawCode[index] || "";
                  const isCurrent =
                    index === rawCode.length ||
                    (index === 5 && rawCode.length === 6);

                  return (
                    <View
                      key={index}
                      // Raised surface: #1C1D21 in dark mode, gentle borders
                      className={`w-12 h-14 rounded-[10px] items-center justify-center border bg-white dark:bg-[#1A1B1E] ${
                        isCurrent
                          ? "border-zinc-800 dark:border-zinc-300"
                          : "border-zinc-200/90 dark:border-zinc-800/80"
                      }`}
                    >
                      <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        {digit}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              {codeErrors.code && (
                <Text className="text-xs text-rose-500 dark:text-rose-400 font-medium text-center px-1">
                  {codeErrors.code.message}
                </Text>
              )}

              <Button
                label="Verify & Continue"
                onPress={handleCodeSubmit(onVerifySubmit)}
                loading={submitting}
                disabled={rawCode.length < 6}
                className="mt-2"
              />
            </View>
          )}

          {/* Toggle to Login */}
          {!pendingVerification && (
            <TouchableOpacity
              activeOpacity={0.7}
              className="mt-6"
              onPress={() => router.replace("/(auth)/SignIn")}
            >
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                Already have an account?{" "}
                <Text className="font-semibold text-zinc-800 dark:text-zinc-200 underline">
                  Log in
                </Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* Micro Legal Copy */}
          <Text className="text-[11px] text-center text-zinc-400 dark:text-zinc-500 mt-6 px-4">
            By continuing, you agree to Saldo's Terms of Service and Privacy
            Policy.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
