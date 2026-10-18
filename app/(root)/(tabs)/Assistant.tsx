import { useUser } from "@clerk/expo";
import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ChatInputBar,
  ChatMessageItem,
  PromptSuggestionsTray,
} from "@features/assistant";
import { confirmToolAction, sendChatMessage } from "@services/ai";
import type { ChatMessage, ToolCallAction } from "@services/ai/types";
import { useSupabase } from "@shared/hooks/useSupabase";
import { getErrorMessage } from "@shared/lib/errors";
import { generateUUID } from "@shared/lib/uuid";
import { Text } from "@shared/ui/Text";
import { invalidateLedgerQueries } from "@store/keys";
import { useUserStore } from "@store/userStore";

const SUGGESTED_PROMPTS = [
  "What is my current total balance?",
  "Spent 200 on coffee and 500 on lunch",
  "Dinner, 6 people, total 4800, Ali paid",
  "I paid 3000 for lunch with Ali, Sara and Hamza",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome-msg",
    role: "assistant",
    content:
      "Hello! I'm **Saldo AI**, your personal financial assistant.\n\nYou can ask me to log single or batched expenses, split bills with friends, create shared groups, check budgets, or reverse transactions.",
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  },
];

export default function AssistantScreen() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const currency = useUserStore((state) => state.currency) || "PKR";
  const theme = useUserStore((state) => state.theme);
  const isDark = theme === "dark";

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const effectiveUserId = user?.id || "default";

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 60);
    });
    return () => sub.remove();
  }, []);

  const invalidateFinancialCaches = () => {
    void invalidateLedgerQueries(queryClient, user?.id);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isThinking) return;

    setInputText("");

    const userMessage: ChatMessage = {
      id: `user-${generateUUID()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);

    try {
      const response = await sendChatMessage(supabase, messages, text, {
        userId: effectiveUserId,
        currency,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${generateUUID()}`,
        role: "assistant",
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        toolAction: response.toolAction,
        toolActions: response.toolActions,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (
        response.toolActions?.some(
          (act) =>
            act.status === "executed" &&
            (act.name === "log_transactions" ||
              act.name === "log_transaction" ||
              act.name === "create_group"),
        )
      ) {
        invalidateFinancialCaches();
      }
    } catch (err: unknown) {
      const errorMessage: ChatMessage = {
        id: `err-${generateUUID()}`,
        role: "assistant",
        content: `Sorry, I encountered an issue: ${getErrorMessage(err, "Failed to process request.")}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleConfirmAction = async (
    messageId: string,
    action: ToolCallAction,
  ) => {
    try {
      const confirmationNote = await confirmToolAction(
        supabase,
        effectiveUserId,
        action,
      );
      invalidateFinancialCaches();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                toolAction: { ...action, status: "confirmed" },
                content: `${m.content}\n\n**Confirmed:** ${confirmationNote}`,
              }
            : m,
        ),
      );
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                toolAction: { ...action, status: "error" },
                content: `${m.content}\n\n*Error: ${getErrorMessage(err)}*`,
              }
            : m,
        ),
      );
    }
  };

  const handleCancelAction = (messageId: string, action: ToolCallAction) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              toolAction: { ...action, status: "cancelled" },
              content: `${m.content}\n\n*Action cancelled by user.*`,
            }
          : m,
      ),
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* 1. Header Bar */}
      <Animated.View
        entering={FadeInDown.duration(240)}
        className="flex-row items-center justify-between px-5 pt-2.5 pb-3 border-b border-surface-border bg-surface"
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(root)/(tabs)")
            }
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
          >
            <Feather
              name="arrow-left"
              size={18}
              color={isDark ? "#F5F5F3" : "#0A0A0B"}
            />
          </Pressable>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base font-black text-ink">Saldo AI</Text>
              <View className="w-2 h-2 rounded-full bg-primary" />
            </View>
            <Text className="text-xs font-semibold text-ink-muted">
              Autonomous Financial Agent
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setMessages(INITIAL_MESSAGES)}
          accessibilityRole="button"
          accessibilityLabel="Reset conversation"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
        >
          <Feather
            name="rotate-ccw"
            size={16}
            color={isDark ? "#9C9C9F" : "#52525B"}
          />
        </Pressable>
      </Animated.View>

      {/* 2. Keyboard-aware container with synchronous native tracking on iOS & Android */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 20,
            gap: 16,
          }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => (
            <ChatMessageItem
              message={item}
              currency={currency}
              onConfirmDelete={handleConfirmAction}
              onCancelDelete={handleCancelAction}
            />
          )}
          ListFooterComponent={
            isThinking ? (
              <View className="flex-row items-center gap-2.5 ml-10 my-2 px-3.5 py-2 rounded-full bg-surface border border-surface-border self-start shadow-2xs">
                <ActivityIndicator size="small" color="#22C55E" />
                <Text className="text-xs font-bold text-ink">
                  Analyzing ledger...
                </Text>
              </View>
            ) : null
          }
        />

        {/* 3. Quick Starter Prompts */}
        <PromptSuggestionsTray
          prompts={SUGGESTED_PROMPTS}
          onSelectPrompt={(prompt) => handleSend(prompt)}
          disabled={isThinking}
        />

        {/* 4. Chat Input Bar */}
        <ChatInputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={(text) => handleSend(text)}
          disabled={isThinking}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
