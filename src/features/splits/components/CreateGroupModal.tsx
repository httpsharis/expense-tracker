import Feather from "@expo/vector-icons/Feather";
import React, { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

import { Button } from "@shared/ui/Button";
import { Text } from "@shared/ui/Text";
import { TextField } from "@shared/ui/TextField";

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, members: string[]) => Promise<void>;
  isSubmitting?: boolean;
}

export function CreateGroupModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [newMemberText, setNewMemberText] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const handleAddMember = () => {
    const trimmed = newMemberText.trim();
    if (!trimmed) return;
    if (members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setError("Member already added");
      return;
    }
    setMembers((prev) => [...prev, trimmed]);
    setNewMemberText("");
    setError(null);
  };

  const handleRemoveMember = (name: string) => {
    setMembers((prev) => prev.filter((m) => m !== name));
  };

  const handleCreate = async () => {
    if (submittingRef.current || isSubmitting) return;
    const trimmed = groupName.trim();
    if (!trimmed) {
      setError("Group name is required");
      return;
    }
    setError(null);
    submittingRef.current = true;
    try {
      await onSubmit(trimmed, members);
      setGroupName("");
      setMembers([]);
      setNewMemberText("");
      onClose();
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/60 justify-end">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface rounded-t-3xl p-6 pb-10 border-t border-surface-border max-h-[85%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-surface-border">
            <View>
              <Text className="text-lg font-black text-ink tracking-tight">
                New Split Group
              </Text>
              <Text className="text-xs font-medium text-ink-muted mt-0.5">
                Organize shared expenses with friends or housemates
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={16} color="#A1A1AA" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="mt-4"
          >
            {/* Group Name Field */}
            <View className="mb-4">
              <Text className="text-[11px] font-bold text-ink-whisper uppercase tracking-wider mb-1.5 px-1">
                Group Name
              </Text>
              <TextField
                value={groupName}
                onChangeText={(t) => {
                  setGroupName(t);
                  if (error) setError(null);
                }}
                placeholder="e.g. Flatmates, Road Trip, Dinner Crew"
              />
            </View>

            {/* Add Member Field */}
            <View className="mb-4">
              <Text className="text-[11px] font-bold text-ink-whisper uppercase tracking-wider mb-1.5 px-1">
                Add Members
              </Text>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <TextField
                    value={newMemberText}
                    onChangeText={setNewMemberText}
                    placeholder="Friend's name..."
                    returnKeyType="done"
                    onSubmitEditing={handleAddMember}
                  />
                </View>
                <Pressable
                  onPress={handleAddMember}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  className="px-4 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-100 items-center justify-center active:scale-95 shadow-2xs"
                >
                  <Text className="text-xs font-bold text-white dark:text-zinc-950">Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Member Chips */}
            <View className="mb-6">
              <Text className="text-[11px] font-bold text-ink-whisper tracking-wider uppercase mb-2 px-1">
                Members in group ({members.length + 1})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="px-3.5 py-1.5 rounded-full bg-surface-muted border border-surface-border">
                  <Text className="text-xs font-bold text-ink">
                    You (Admin)
                  </Text>
                </View>
                {members.map((name) => (
                  <View
                    key={name}
                    className="flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-surface-border"
                  >
                    <Text className="text-xs font-medium text-ink">
                      {name}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveMember(name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={13} color="#A1A1AA" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {error && (
              <Text className="text-xs font-medium text-coral mb-4 px-1">
                {error}
              </Text>
            )}

            <Button
              label="Create Group"
              onPress={handleCreate}
              disabled={Boolean(isSubmitting)}
              loading={isSubmitting}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
