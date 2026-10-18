import { create } from "zustand";

export type PromptVariant = "danger" | "warning" | "info" | "success" | "default";

export interface PromptOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: PromptVariant;
  icon?: string;
  isAlert?: boolean;
}

interface PromptState {
  isOpen: boolean;
  options: PromptOptions;
  isProcessing: boolean;
  resolvePromise: ((value: boolean) => void) | null;

  confirm: (options: PromptOptions) => Promise<boolean>;
  alert: (options: Omit<PromptOptions, "isAlert">) => Promise<void>;
  setProcessing: (isProcessing: boolean) => void;
  close: (confirmed: boolean) => void;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  isOpen: false,
  options: {
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default",
    isAlert: false,
  },
  isProcessing: false,
  resolvePromise: null,

  confirm: (options: PromptOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options: {
          confirmText: options.variant === "danger" ? "Delete" : "Confirm",
          cancelText: "Cancel",
          variant: "default",
          ...options,
          isAlert: false,
        },
        isProcessing: false,
        resolvePromise: resolve,
      });
    });
  },

  alert: (options: Omit<PromptOptions, "isAlert">) => {
    return new Promise<void>((resolve) => {
      set({
        isOpen: true,
        options: {
          confirmText: "Understood",
          variant: "warning",
          ...options,
          isAlert: true,
        },
        isProcessing: false,
        resolvePromise: () => resolve(),
      });
    });
  },

  setProcessing: (isProcessing: boolean) => set({ isProcessing }),

  close: (confirmed: boolean) => {
    const { resolvePromise } = get();
    if (resolvePromise) {
      resolvePromise(confirmed);
    }
    set({
      isOpen: false,
      resolvePromise: null,
      isProcessing: false,
    });
  },
}));

/**
 * Universal hook to invoke confirmation prompts and alerts anywhere in the app.
 */
export function usePrompt() {
  const confirm = usePromptStore((s) => s.confirm);
  const alert = usePromptStore((s) => s.alert);
  const setProcessing = usePromptStore((s) => s.setProcessing);

  return { confirm, alert, setProcessing };
}
