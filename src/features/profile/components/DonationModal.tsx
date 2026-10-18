import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { DONATION_CONFIG } from "@shared/constants/donations";
import { copyToClipboard as safeCopyToClipboard } from "@shared/lib/clipboard";

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
}

type CopiedTarget = "iban" | "kofi" | "raast" | null;

export function DonationModal({ visible, onClose }: DonationModalProps) {
  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget>(null);
  const [activeTab, setActiveTab] = useState<"international" | "pakistan">("international");

  const copyToClipboard = async (text: string, target: CopiedTarget) => {
    try {
      await safeCopyToClipboard(text);
      setCopiedTarget(target);
      setTimeout(() => {
        setCopiedTarget((current) => (current === target ? null : current));
      }, 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenKofi = () => {
    Linking.openURL(DONATION_CONFIG.kofi.url).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/60 justify-end"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface rounded-t-[32px] p-6 pb-10 max-h-[88%] border-t border-surface-border"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-surface-divider">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                <Feather name="heart" size={20} color="#22C55E" />
              </View>
              <View>
                <Text className="text-lg font-black text-ink tracking-tight">
                  Support Saldo
                </Text>
                <Text className="text-xs text-ink-muted">
                  Keep development active & open source
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close donation modal"
              hitSlop={12}
              className="w-10 h-10 rounded-full bg-surface-muted border border-surface-border items-center justify-center active:scale-95"
            >
              <Feather name="x" size={18} color="#6B6B6E" />
            </Pressable>
          </View>

          {/* Segmented Switcher */}
          <View className="flex-row p-1 mt-4 rounded-2xl bg-surface-muted border border-surface-border">
            <Pressable
              onPress={() => setActiveTab("international")}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center flex-row gap-2 ${
                activeTab === "international"
                  ? "bg-surface border border-surface-border shadow-xs"
                  : ""
              }`}
            >
              <Ionicons
                name="globe-outline"
                size={15}
                color={activeTab === "international" ? "#22C55E" : "#6B6B6E"}
              />
              <Text
                className={`text-xs font-black ${
                  activeTab === "international" ? "text-ink" : "text-ink-muted"
                }`}
              >
                International
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("pakistan")}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center flex-row gap-2 ${
                activeTab === "pakistan"
                  ? "bg-surface border border-surface-border shadow-xs"
                  : ""
              }`}
            >
              <Ionicons
                name="business-outline"
                size={15}
                color={activeTab === "pakistan" ? "#22C55E" : "#6B6B6E"}
              />
              <Text
                className={`text-xs font-black ${
                  activeTab === "pakistan" ? "text-ink" : "text-ink-muted"
                }`}
              >
                Pakistan (IBAN)
              </Text>
            </Pressable>
          </View>

          <ScrollView
            className="mt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {activeTab === "international" ? (
              /* ── TAB 1: INTERNATIONAL (KO-FI) ── */
              <View className="gap-4">
                <View className="p-5 rounded-2xl bg-surface-muted border border-surface-border">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2.5">
                      <Ionicons name="cafe" size={20} color="#FF5E5B" />
                      <Text className="text-base font-extrabold text-ink">
                        Ko-fi
                      </Text>
                    </View>
                    <View className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <Text className="text-[10px] font-black text-primary uppercase">
                        Global • Cards & PayPal
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-ink-muted mt-2.5 leading-relaxed">
                    Support Saldo with a coffee! Fast, secure tipping via debit/credit cards, Apple Pay, Google Pay, or PayPal.
                  </Text>

                  {/* Ko-fi Link Card */}
                  <Pressable
                    onPress={() =>
                      copyToClipboard(DONATION_CONFIG.kofi.url, "kofi")
                    }
                    className="flex-row items-center justify-between p-3.5 mt-4 rounded-xl bg-surface border border-surface-border active:scale-[0.99]"
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-[10px] uppercase font-bold text-ink-whisper">
                        Direct Page URL
                      </Text>
                      <Text className="text-xs font-bold text-ink mt-0.5" numberOfLines={1}>
                        {DONATION_CONFIG.kofi.displayUrl}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-muted border border-surface-border">
                      <Feather
                        name={copiedTarget === "kofi" ? "check" : "copy"}
                        size={13}
                        color={copiedTarget === "kofi" ? "#22C55E" : "#6B6B6E"}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          copiedTarget === "kofi" ? "text-primary" : "text-ink-muted"
                        }`}
                      >
                        {copiedTarget === "kofi" ? "Copied!" : "Copy"}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Open Link CTA Button */}
                  <Pressable
                    onPress={handleOpenKofi}
                    className="w-full h-12 rounded-xl bg-primary items-center justify-center flex-row gap-2 mt-4 active:scale-98"
                  >
                    <Feather name="external-link" size={16} color="#FFFFFF" />
                    <Text className="text-sm font-black text-white">
                      Open Ko-fi Page
                    </Text>
                  </Pressable>
                </View>

                {/* Additional Perks note */}
                <View className="p-4 rounded-2xl bg-surface-muted/50 border border-surface-border">
                  <Text className="text-xs text-ink-muted leading-relaxed">
                    💡 All contributions go directly toward running Supabase edge databases, Clerk auth quotas, and continuous mobile updates.
                  </Text>
                </View>
              </View>
            ) : (
              /* ── TAB 2: PAKISTAN (IBAN & RAAST) ── */
              <View className="gap-4">
                <View className="p-5 rounded-2xl bg-surface-muted border border-surface-border">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2.5">
                      <Feather name="credit-card" size={18} color="#22C55E" />
                      <Text className="text-base font-extrabold text-ink">
                        Bank Transfer (Pakistan)
                      </Text>
                    </View>
                    <View className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <Text className="text-[10px] font-black text-primary uppercase">
                        Instant • 0% Fee
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-ink-muted mt-2.5 leading-relaxed">
                    Transfer any amount directly using Raast or IBAN through any banking app (Nayapay, Sadapay, Meezan, HBL, etc.).
                  </Text>

                  {/* Bank Details Breakdown */}
                  <View className="mt-4 gap-2.5">
                    {/* Bank & Account Title */}
                    <View className="p-3 rounded-xl bg-surface border border-surface-border flex-row items-center justify-between">
                      <View>
                        <Text className="text-[10px] uppercase font-bold text-ink-whisper">
                          Bank Name
                        </Text>
                        <Text className="text-xs font-bold text-ink mt-0.5">
                          {DONATION_CONFIG.pakistan.bankName}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[10px] uppercase font-bold text-ink-whisper">
                          Account Title
                        </Text>
                        <Text className="text-xs font-bold text-ink mt-0.5">
                          {DONATION_CONFIG.pakistan.accountTitle}
                        </Text>
                      </View>
                    </View>

                    {/* IBAN Card with Auto Copy */}
                    <Pressable
                      onPress={() =>
                        copyToClipboard(DONATION_CONFIG.pakistan.iban, "iban")
                      }
                      className="p-4 rounded-xl bg-surface border border-surface-border active:scale-[0.99]"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-[10px] uppercase font-black text-ink-muted tracking-wider">
                            IBAN / Raast Number
                          </Text>
                          <View className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                            <Text className="text-[9px] font-black text-primary uppercase">
                              Raast Active
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-muted border border-surface-border">
                          <Feather
                            name={copiedTarget === "iban" ? "check" : "copy"}
                            size={12}
                            color={copiedTarget === "iban" ? "#22C55E" : "#6B6B6E"}
                          />
                          <Text
                            className={`text-[11px] font-black ${
                              copiedTarget === "iban"
                                ? "text-primary"
                                : "text-ink-muted"
                            }`}
                          >
                            {copiedTarget === "iban" ? "Copied!" : "Tap to Copy"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        selectable
                        className="text-xs font-mono font-bold text-ink tracking-wider select-all"
                      >
                        {DONATION_CONFIG.pakistan.ibanFormatted}
                      </Text>
                    </Pressable>

                    {/* Separate Raast ID (if different from IBAN) */}
                    {DONATION_CONFIG.pakistan.raastId &&
                      DONATION_CONFIG.pakistan.raastId !==
                        DONATION_CONFIG.pakistan.iban && (
                        <Pressable
                          onPress={() =>
                            copyToClipboard(
                              DONATION_CONFIG.pakistan.raastId!,
                              "raast",
                            )
                          }
                          className="p-3.5 rounded-xl bg-surface border border-surface-border flex-row items-center justify-between active:scale-[0.99]"
                        >
                          <View>
                            <Text className="text-[10px] uppercase font-bold text-ink-whisper">
                              Raast ID
                            </Text>
                            <Text className="text-xs font-bold text-ink mt-0.5">
                              {DONATION_CONFIG.pakistan.raastId}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-muted border border-surface-border">
                            <Feather
                              name={copiedTarget === "raast" ? "check" : "copy"}
                              size={12}
                              color={copiedTarget === "raast" ? "#22C55E" : "#6B6B6E"}
                            />
                            <Text
                              className={`text-[11px] font-black ${
                                copiedTarget === "raast"
                                  ? "text-primary"
                                  : "text-ink-muted"
                              }`}
                            >
                              {copiedTarget === "raast" ? "Copied!" : "Copy"}
                            </Text>
                          </View>
                        </Pressable>
                      )}
                  </View>

                  {/* Copy IBAN Main Action Button */}
                  <Pressable
                    onPress={() =>
                      copyToClipboard(DONATION_CONFIG.pakistan.iban, "iban")
                    }
                    className="w-full h-12 rounded-xl bg-primary items-center justify-center flex-row gap-2 mt-4 active:scale-98"
                  >
                    <Feather
                      name={copiedTarget === "iban" ? "check" : "copy"}
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text className="text-sm font-black text-white">
                      {copiedTarget === "iban"
                        ? "Copied to Clipboard!"
                        : "Copy IBAN / Raast Number"}
                    </Text>
                  </Pressable>
                </View>

                {/* Copied Feedback Notification */}
                {copiedTarget && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex-row items-center justify-center gap-2"
                  >
                    <Feather name="check-circle" size={14} color="#22C55E" />
                    <Text className="text-xs font-black text-primary">
                      {copiedTarget === "iban"
                        ? "IBAN copied! Ready to paste in your banking app."
                        : copiedTarget === "raast"
                          ? "Raast ID copied to clipboard!"
                          : "Ko-fi link copied to clipboard!"}
                    </Text>
                  </Animated.View>
                )}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

