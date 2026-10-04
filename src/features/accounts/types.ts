import Ionicons from "@expo/vector-icons/Ionicons";
import type { AccountType, AccountWithBalance } from "../../../services/accounts";

export type { AccountType, AccountWithBalance };

export interface AccountTypeConfig {
  type: AccountType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgGradient: string;
  accentColor: string;
}

export const ACCOUNT_CONFIGS: Record<AccountType, AccountTypeConfig> = {
  bank: {
    type: "bank",
    label: "Bank Account",
    icon: "business-outline",
    bgGradient: "bg-[#0F172A]", // Deep Obsidian Navy
    accentColor: "#93C5FD",
  },
  cash: {
    type: "cash",
    label: "Cash",
    icon: "cash-outline",
    bgGradient: "bg-[#064E3B]", // Rich Forest Green
    accentColor: "#86EFAC",
  },
  wallet: {
    type: "wallet",
    label: "Digital Wallet",
    icon: "wallet-outline",
    bgGradient: "bg-[#1E3A8A]", // Royal Cobalt
    accentColor: "#67E8F9",
  },
  credit_card: {
    type: "credit_card",
    label: "Credit Card",
    icon: "card-outline",
    bgGradient: "bg-[#18181B]", // Titanium Slate
    accentColor: "#FDE047",
  },
  savings: {
    type: "savings",
    label: "Savings",
    icon: "file-tray-full-outline",
    bgGradient: "bg-[#451A03]", // Warm Amber Bronze
    accentColor: "#FDBA74",
  },
};

export const FILTER_ITEMS: { key: string; label: string }[] = [
  { key: "all", label: "All accounts" },
  { key: "bank", label: "Bank" },
  { key: "cash", label: "Cash" },
  { key: "wallet", label: "Wallet" },
  { key: "savings", label: "Savings" },
  { key: "credit_card", label: "Credit" },
];

export interface AccountCardProps {
  account: AccountWithBalance;
  storeCurrency?: string;
  onEdit: (account: AccountWithBalance) => void;
  onDelete: (account: AccountWithBalance) => void;
  onSetDefault: (account: AccountWithBalance) => void;
}

export interface AccountFormModalProps {
  visible: boolean;
  mode: "create" | "edit";
  account: AccountWithBalance | null;
  accountsCount: number;
  storeCurrency?: string;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    type: AccountType;
    isDefault: boolean;
    initialBalance?: number;
    balanceAdjustmentDelta?: number;
  }) => Promise<void>;
  onDelete?: (account: AccountWithBalance) => void;
  isSaving: boolean;
}

export interface AccountTotalBannerProps {
  totalBalance: number;
  accountsCount: number;
  currency?: string;
}

export interface AccountFilterChipsProps {
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}
