import Feather from "@expo/vector-icons/Feather";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserStore } from "@store/userStore";

interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text?: string) => void;
  disabled?: boolean;
}

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  disabled = false,
}: ChatInputBarProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const theme = useUserStore((s) => s.theme);
  const isDark = theme === "dark";

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !disabled;
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () =>
      setIsKeyboardOpen(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardOpen(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSendPress = () => {
    if (!canSend) return;
    onSend(trimmed);
  };

  return (
    <View
      className="px-4 pt-2.5 bg-canvas border-t border-surface-divider"
      style={{
        paddingBottom: isKeyboardOpen
          ? (Platform.OS === "ios" ? 10 : 10)
          : Math.max(94, insets.bottom + 82),
      }}
    >
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        className="flex-row items-end bg-surface border border-surface-border rounded-3xl pl-4 pr-2 py-2 shadow-2xs"
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask Saldo AI or log an expense..."
          placeholderTextColor={isDark ? "#8E8E93" : "#71717A"}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSendPress}
          multiline={false}
          autoCapitalize="sentences"
          autoCorrect
          style={{
            flex: 1,
            minHeight: 42,
            paddingVertical: Platform.OS === "ios" ? 8 : 6,
            color: isDark ? "#F5F5F3" : "#0A0A0B",
            fontSize: 15,
            fontWeight: "500",
          }}
        />

        <Pressable
          onPress={handleSendPress}
          disabled={!canSend}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          className={`w-10 h-10 rounded-full items-center justify-center ml-2 active:scale-95 ${
            canSend
              ? "bg-primary"
              : "bg-surface-muted border border-surface-border opacity-60"
          }`}
        >
          {disabled ? (
            <ActivityIndicator
              size="small"
              color={isDark ? "#F5F5F3" : "#0A0A0B"}
            />
          ) : (
            <Feather
              name="arrow-up"
              size={18}
              color={canSend ? "#FFFFFF" : isDark ? "#6B6B70" : "#9CA3AF"}
            />
          )}
        </Pressable>
      </Pressable>
    </View>
  );
}
