import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  parseReceiptWithAI,
  type ScannedReceiptResult,
} from "@services/ai/receiptScanner";
import { formatCurrency } from "@shared/lib/currency";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { usePrompt } from "@store/promptStore";

export interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyScannedData: (data: ScannedReceiptResult) => void;
  currency?: string;
}

export function ReceiptScannerModal({
  visible,
  onClose,
  onApplyScannedData,
  currency = "PKR",
}: ReceiptScannerModalProps) {
  const { alert } = usePrompt();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedReceiptResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Editable fields post-scan
  const [merchant, setMerchant] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const resetState = () => {
    setImageUri(null);
    setIsScanning(false);
    setScanResult(null);
    setScanError(null);
    setMerchant("");
    setAmountStr("");
    setCategory("");
    setNotes("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processImage = async (base64: string, uri: string) => {
    setImageUri(uri);
    setIsScanning(true);
    setScanError(null);

    try {
      const result = await parseReceiptWithAI(base64, "image/jpeg");
      result.imageUri = uri;
      setScanResult(result);
      setMerchant(result.merchant);
      setAmountStr(String(result.amount));
      setCategory(result.category);
      setNotes(result.note);
    } catch (err: unknown) {
      setScanError(
        err instanceof Error
          ? err.message
          : "Could not scan receipt. You can enter details manually.",
      );
      // Still allow manual logging if photo was taken
      setMerchant("Store Receipt");
      setAmountStr("");
      setCategory("Shopping");
    } finally {
      setIsScanning(false);
    }
  };

  // Launch Camera with Permission Handling
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        await alert({
          title: "Camera Permission Required",
          message: "Saldo needs camera access to capture paper receipts and invoices for automatic AI logging. Please enable camera access in your device settings.",
          variant: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        await processImage(result.assets[0].base64, result.assets[0].uri);
      }
    } catch (err: unknown) {
      await alert({
        title: "Camera Error",
        message: err instanceof Error ? err.message : "Failed to open camera.",
        variant: "danger",
      });
    }
  };

  // Pick from Photo Library with Permission Handling
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        await alert({
          title: "Photos Permission Required",
          message: "Saldo needs photo library access to scan existing receipts and invoice screenshots.",
          variant: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        await processImage(result.assets[0].base64, result.assets[0].uri);
      }
    } catch (err: unknown) {
      await alert({
        title: "Library Error",
        message: err instanceof Error ? err.message : "Failed to open photo library.",
        variant: "danger",
      });
    }
  };

  const handleApply = () => {
    const parsedAmount = fromMinorUnits(
      toMinorUnits(Math.abs(parseFloat(amountStr) || 0)),
    );

    const payload: ScannedReceiptResult = {
      merchant: merchant.trim() || "Scanned Receipt",
      amount: parsedAmount,
      date: scanResult?.date || new Date().toISOString().slice(0, 10),
      category: category.trim() || "Shopping",
      note: notes.trim(),
      imageUri: imageUri || undefined,
    };

    onApplyScannedData(payload);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        className="flex-1 bg-canvas dark:bg-canvas-dark"
        edges={["top", "bottom"]}
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-divider dark:border-surface-border-dark">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
              <Feather name="camera" size={16} color="#22C55E" />
            </View>
            <View>
              <Text className="text-base font-black text-ink dark:text-ink-light tracking-tight">
                Scan Receipt
              </Text>
              <Text className="text-[11px] font-semibold text-ink-muted dark:text-ink-muted-dark">
                Multimodal AI Vision Extraction
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleClose}
            hitSlop={8}
            className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center active:scale-95"
          >
            <Feather name="x" size={16} color="#A0A0A3" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-6 py-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* If No Image is Selected: Capture Options */}
          {!imageUri ? (
            <View className="py-8 items-center">
              <View className="w-20 h-20 rounded-3xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark items-center justify-center mb-5 shadow-sm">
                <Ionicons name="document-text-outline" size={36} color="#22C55E" />
              </View>

              <Text className="text-xl font-black text-ink dark:text-ink-light text-center">
                Capture Invoice or Bill
              </Text>
              <Text className="text-xs text-ink-muted dark:text-ink-muted-dark text-center mt-1.5 max-w-[280px] leading-relaxed">
                Snap a photo of your paper receipt or upload a digital invoice.
                Gemini AI will extract the amount, merchant, and category.
              </Text>

              {/* Action Buttons */}
              <View className="w-full mt-8 gap-3">
                <Pressable
                  onPress={handleTakePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Open camera to photograph receipt"
                  className="w-full py-4 rounded-2xl bg-primary flex-row items-center justify-center gap-2.5 active:scale-97 shadow-sm"
                >
                  <Feather name="camera" size={18} color="#FFFFFF" />
                  <Text className="text-sm font-black text-white">
                    Take Photo with Camera
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handlePickImage}
                  accessibilityRole="button"
                  accessibilityLabel="Choose receipt from photo library"
                  className="w-full py-3.5 rounded-2xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark flex-row items-center justify-center gap-2.5 active:scale-97 shadow-2xs"
                >
                  <Feather name="image" size={18} color="#22C55E" />
                  <Text className="text-sm font-bold text-ink dark:text-ink-light">
                    Choose from Photos
                  </Text>
                </Pressable>
              </View>

              {/* Privacy Notice */}
              <View className="mt-8 px-4 py-3 rounded-2xl bg-surface-muted dark:bg-surface-dark/50 border border-surface-border dark:border-surface-border-dark flex-row items-center gap-2.5">
                <Ionicons name="shield-checkmark-outline" size={16} color="#22C55E" />
                <Text className="text-[11px] text-ink-muted dark:text-ink-muted-dark flex-1">
                  Photos are parsed securely via Gemini AI to extract transaction
                  figures without retaining your personal images.
                </Text>
              </View>
            </View>
          ) : (
            <View>
              {/* Receipt Preview Thumbnail */}
              <View className="relative w-full h-48 rounded-2xl overflow-hidden bg-surface-muted dark:bg-surface-dark border border-surface-border dark:border-surface-border-dark mb-4">
                <Image
                  source={{ uri: imageUri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />

                <Pressable
                  onPress={resetState}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 flex-row items-center gap-1.5"
                >
                  <Feather name="refresh-cw" size={12} color="#FFFFFF" />
                  <Text className="text-[11px] font-bold text-white">Retake</Text>
                </Pressable>
              </View>

              {/* Scanning Loader State */}
              {isScanning ? (
                <View className="py-8 items-center bg-surface dark:bg-surface-dark rounded-3xl p-6 border border-surface-border dark:border-surface-border-dark shadow-2xs">
                  <ActivityIndicator size="large" color="#22C55E" />
                  <Text className="text-sm font-black text-ink dark:text-ink-light mt-3">
                    Analyzing Receipt with AI...
                  </Text>
                  <Text className="text-xs text-ink-muted dark:text-ink-muted-dark text-center mt-1">
                    Detecting merchant, grand total, and purchase category.
                  </Text>
                </View>
              ) : (
                <View className="bg-surface dark:bg-surface-dark rounded-3xl p-5 border border-surface-border dark:border-surface-border-dark shadow-2xs">
                  {scanError ? (
                    <View className="mb-4 p-3 rounded-2xl bg-coral/10 border border-coral/25 flex-row items-center gap-2">
                      <Feather name="alert-circle" size={16} color="#EF4444" />
                      <Text className="text-xs font-semibold text-coral flex-1">
                        {scanError}
                      </Text>
                    </View>
                  ) : (
                    <View className="mb-4 p-3 rounded-2xl bg-primary/10 border border-primary/25 flex-row items-center gap-2">
                      <Ionicons name="sparkles" size={16} color="#22C55E" />
                      <Text className="text-xs font-bold text-primary flex-1">
                        Receipt successfully extracted by AI!
                      </Text>
                    </View>
                  )}

                  {/* Merchant Input */}
                  <View className="mb-3.5">
                    <Text className="text-[10px] font-black uppercase text-ink-whisper dark:text-ink-whisper-dark tracking-wider mb-1">
                      Merchant / Vendor
                    </Text>
                    <TextInput
                      value={merchant}
                      onChangeText={setMerchant}
                      placeholder="Merchant name"
                      className="px-3.5 py-2.5 rounded-xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark text-xs font-bold text-ink dark:text-ink-light"
                    />
                  </View>

                  {/* Total Amount Input */}
                  <View className="mb-3.5">
                    <Text className="text-[10px] font-black uppercase text-ink-whisper dark:text-ink-whisper-dark tracking-wider mb-1">
                      Total Amount ({currency})
                    </Text>
                    <TextInput
                      value={amountStr}
                      onChangeText={setAmountStr}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      className="px-3.5 py-2.5 rounded-xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark text-base font-black text-ink dark:text-ink-light tabular-nums"
                    />
                  </View>

                  {/* Suggested Category */}
                  <View className="mb-3.5">
                    <Text className="text-[10px] font-black uppercase text-ink-whisper dark:text-ink-whisper-dark tracking-wider mb-1">
                      Category
                    </Text>
                    <TextInput
                      value={category}
                      onChangeText={setCategory}
                      placeholder="e.g. Food & Dining, Groceries"
                      className="px-3.5 py-2.5 rounded-xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark text-xs font-bold text-ink dark:text-ink-light"
                    />
                  </View>

                  {/* Itemized Notes */}
                  <View className="mb-5">
                    <Text className="text-[10px] font-black uppercase text-ink-whisper dark:text-ink-whisper-dark tracking-wider mb-1">
                      Notes / Items
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Extracted line items"
                      multiline
                      numberOfLines={2}
                      className="px-3.5 py-2.5 rounded-xl bg-surface-muted dark:bg-surface-muted-dark border border-surface-border dark:border-surface-border-dark text-xs font-medium text-ink dark:text-ink-light min-h-[50px]"
                    />
                  </View>

                  {/* Apply Button */}
                  <Pressable
                    onPress={handleApply}
                    accessibilityRole="button"
                    accessibilityLabel="Apply scanned receipt to transaction"
                    className="w-full py-4 rounded-2xl bg-primary flex-row items-center justify-center gap-2 active:scale-97 shadow-sm"
                  >
                    <Feather name="check" size={18} color="#FFFFFF" />
                    <Text className="text-sm font-black text-white">
                      Apply to Transaction
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

