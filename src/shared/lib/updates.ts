import * as Updates from "expo-updates";

export interface UpdateCheckResult {
  status: "dev_mode" | "up_to_date" | "updated" | "error";
  message: string;
}

/**
 * Checks for EAS Over-The-Air updates and downloads them if available.
 * Safely guards against __DEV__ and Expo Go where OTA updates are disabled.
 */
export async function checkAndApplyUpdate(
  interactive: boolean = false,
  onPromptRestart?: () => Promise<boolean>,
): Promise<UpdateCheckResult> {
  if (__DEV__ || !Updates.isEnabled) {
    return {
      status: "dev_mode",
      message: "Over-the-air updates are active in standalone APK and release builds.",
    };
  }

  try {
    const update = await Updates.checkForUpdateAsync();

    if (!update.isAvailable) {
      return {
        status: "up_to_date",
        message: "You're using the latest version of Saldo.",
      };
    }

    // Download the new update bundle in the background
    await Updates.fetchUpdateAsync();

    // If an interactive prompt was requested, ask user if they want to restart immediately
    if (onPromptRestart) {
      const shouldRestart = await onPromptRestart();
      if (shouldRestart) {
        await Updates.reloadAsync();
      }
    }

    return {
      status: "updated",
      message: "A new update has been downloaded. Restart the app to apply changes.",
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Unable to check for updates.";
    return {
      status: "error",
      message: errorMsg,
    };
  }
}

