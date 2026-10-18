/**
 * Safe clipboard helper that dynamically imports expo-clipboard
 * to prevent runtime top-level bundle crashes if native modules are not linked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const Clipboard = await import("expo-clipboard");
    if (Clipboard && typeof Clipboard.setStringAsync === "function") {
      await Clipboard.setStringAsync(text);
      return true;
    }
  } catch {
    // Native module not linked or unavailable in current runtime
  }

  return false;
}

