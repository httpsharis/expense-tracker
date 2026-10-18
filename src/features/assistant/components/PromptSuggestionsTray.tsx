import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Text } from "@shared/ui/Text";

interface PromptSuggestionsTrayProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptSuggestionsTray({
  prompts,
  onSelectPrompt,
  disabled,
}: PromptSuggestionsTrayProps) {
  return (
    <View className="py-2 border-t border-surface-divider bg-canvas">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {prompts.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onSelectPrompt(prompt)}
            disabled={disabled}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            className="px-4 py-2.5 rounded-full bg-surface border border-surface-border active:scale-95 shadow-2xs disabled:opacity-50"
          >
            <Text className="text-[13px] font-bold text-ink">
              {prompt}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
