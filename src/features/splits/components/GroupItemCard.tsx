import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, View } from "react-native";

import type { GroupWithMembers } from "@services/splits";
import { Surface } from "@shared/ui/Surface";
import { Text } from "@shared/ui/Text";

interface GroupItemCardProps {
  group: GroupWithMembers;
  onPress?: () => void;
}

export function GroupItemCard({ group, onPress }: GroupItemCardProps) {
  const memberInitials = (group.members || []).map((m) =>
    (m.name?.[0] || "?").toUpperCase()
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Group ${group.name} with ${group.members?.length || 0} members`}
      className="active:scale-98 transition-all"
    >
      <Surface
        variant="flat"
        className="p-4 rounded-2xl border border-surface-border bg-surface flex-row items-center justify-between shadow-2xs"
      >
        <View className="flex-row items-center gap-3.5 flex-1 mr-3">
          <View className="w-11 h-11 rounded-2xl bg-surface-muted border border-surface-border items-center justify-center">
            <Feather name="users" size={17} color="#22C55E" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-ink" numberOfLines={1}>
              {group.name}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              <Text className="text-[11px] text-ink-muted">
                {group.members?.length || 0} members:
              </Text>
              <View className="flex-row items-center -space-x-1">
                {memberInitials.slice(0, 4).map((initial, idx) => (
                  <View
                    key={idx}
                    className="w-5 h-5 rounded-full bg-surface-muted border border-surface items-center justify-center"
                  >
                    <Text className="text-[9px] font-bold text-ink">
                      {initial}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <Feather name="chevron-right" size={16} color="#A1A1AA" />
      </Surface>
    </Pressable>
  );
}
