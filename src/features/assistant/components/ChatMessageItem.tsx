import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { ChatMessage, ToolCallAction } from "@services/ai/types";
import { MarkdownText } from "@shared/ui/MarkdownText";
import { Text } from "@shared/ui/Text";
import { ToolActionCard } from "./ToolActionCard";

interface ChatMessageItemProps {
  message: ChatMessage;
  currency: string;
  onConfirmDelete?: (messageId: string, action: ToolCallAction) => void;
  onCancelDelete?: (messageId: string, action: ToolCallAction) => void;
}

export function ChatMessageItem({
  message,
  currency,
  onConfirmDelete,
  onCancelDelete,
}: ChatMessageItemProps) {
  const isUser = message.role === "user";

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      className={`flex-row ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <View className="w-8 h-8 rounded-full bg-surface border border-surface-border items-center justify-center mr-2.5 mt-1 shadow-2xs">
          <Ionicons name="sparkles" size={15} color="#22C55E" />
        </View>
      )}

      <View className="max-w-[86%]">
        {/* Message Bubble with Markdown formatting & comfortable font size */}
        {isUser ? (
          <View className="px-4 py-3 rounded-3xl bg-primary rounded-tr-xs shadow-2xs">
            <MarkdownText content={message.content} isUser />
          </View>
        ) : (
          <View className="px-4 py-3.5 rounded-3xl rounded-tl-xs bg-surface border border-surface-border shadow-2xs">
            <MarkdownText content={message.content} isUser={false} />
          </View>
        )}

        {/* Embedded Tool Action Card */}
        {message.toolAction && (
          <ToolActionCard
            action={message.toolAction}
            currency={currency}
            onConfirmDelete={
              onConfirmDelete
                ? () => onConfirmDelete(message.id, message.toolAction!)
                : undefined
            }
            onCancelDelete={
              onCancelDelete
                ? () => onCancelDelete(message.id, message.toolAction!)
                : undefined
            }
          />
        )}

        {/* Timestamp */}
        <Text
          className={`text-[10px] text-ink-whisper mt-1 ${
            isUser ? "text-right mr-1" : "text-left ml-1"
          }`}
        >
          {message.timestamp}
        </Text>
      </View>
    </Animated.View>
  );
}
