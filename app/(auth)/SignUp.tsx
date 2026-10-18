import { useClerk, useSignUp } from "@clerk/expo";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "@shared/lib/errors";
import {
    codeSchema,
    SignUpSchema,
    signUpSchema,
} from "@shared/lib/schemas/auth";
import { useGoogleAuth } from "@shared/lib/useGoogleAuth";
import { Button } from "@shared/ui/Button";
import { SaldoLogo } from "@shared/ui/Logo";
import { TextField } from "@shared/ui/TextField";
import { usePrompt } from "@store/promptStore";

export default function SignUp() {
  const { signUp } = useSignUp();
  const { setActive } = useClerk();
  const router = useRouter();
  const { signInWithGoogle, isAuthenticating: isGoogleAuth } = useGoogleAuth();

  const [pendingVerification, setPendingVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { alert } = usePrompt();

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
  const submittingRef = useRef(false);

  const onSignUpSubmit = async (data: SignUpSchema) => {
    if (!signUp || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      await signUp.create({
        emailAddress: data.email.trim().toLowerCase(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });

      await signUp.verifications.sendEmailCode();
      setPendingVerification(true);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      await alert({
        title: "Sign Up Failed",
        message,
        variant: "danger",
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const onVerifySubmit = async ({ code }: { code: string }) => {
    if (!signUp || submittingRef.current) return;
    const sanitizedCode = code.trim();
    if (sanitizedCode.length < 6) {
      await alert({
        title: "Verification Code",
        message: "Please enter the 6-digit verification code.",
        variant: "warning",
      });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const { error } = await signUp.verifications.verifyEmailCode({
        code: sanitizedCode,
      });

      if (error) {
        await alert({
          title: "Verification Failed",
          message: error.message || "Invalid Verification Code.",
          variant: "danger",
        });
        return;
      }

      if (signUp.status === "complete" && signUp.createdSessionId) {
        await setActive({ session: signUp.createdSessionId });
        router.replace("/(root)/(tabs)");
      } else {
        await alert({
          title: "Verification Pending",
          message: "Please check your code and try again.",
          variant: "warning",
        });
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      await alert({
        title: "Verification Failed",
        message,
        variant: "danger",
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
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
                color="#71717A"
              />
              <Text className="text-sm font-semibold text-ink-muted">
                Edit details
              </Text>
            </TouchableOpacity>
          )}

          {/* Top Brand Logo */}
          <SaldoLogo size={60} color="#22C55E" className="mb-4" />

          {/* Headers */}
          <Text className="text-2xl font-black text-center text-ink tracking-tight">
            {pendingVerification ? "Enter verification code" : "Create account"}
          </Text>

          <Text className="text-sm font-medium text-center text-ink-muted mt-1.5 mb-7">
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
                <Text className="text-xs text-coral font-semibold text-left px-1 mt-0.5">
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
                disabled={isGoogleAuth || submitting}
                className="mt-1"
              />

              {/* Monochromatic Divider */}
              <View className="flex-row items-center w-full my-3">
                <View className="flex-1 h-[1px] bg-surface-border" />
                <Text className="mx-3 text-[11px] uppercase tracking-wider text-ink-whisper font-bold">
                  or
                </Text>
                <View className="flex-1 h-[1px] bg-surface-border" />
              </View>

              {/* Google OAuth Action Button */}
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
                      Sign up with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: 6-Digit OTP Verification */}
          {pendingVerification && (
            <View className="w-full gap-4 items-center">
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

              {/* 6-slot visual display */}
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
                      className={`w-12 h-14 rounded-2xl items-center justify-center border bg-surface ${
                        isCurrent
                          ? "border-primary"
                          : "border-surface-border"
                      }`}
                    >
                      <Text className="text-xl font-black text-ink">
                        {digit}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              {codeErrors.code && (
                <Text className="text-xs text-coral font-semibold text-center px-1">
                  {codeErrors.code.message}
                </Text>
              )}

              <Button
                label="Verify & Continue"
                onPress={handleCodeSubmit(onVerifySubmit)}
                loading={submitting}
                disabled={rawCode.length < 6 || submitting}
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
              <Text className="text-sm font-medium text-ink-muted">
                Already have an account?{" "}
                <Text className="font-bold text-ink underline">
                  Log in
                </Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* Micro Legal Copy */}
          <Text className="text-[11px] text-center text-ink-whisper mt-6 px-4">
            By continuing, you agree to Saldo's Terms of Service and Privacy
            Policy.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
