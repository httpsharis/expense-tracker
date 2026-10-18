import type { AccountWithBalance } from "../../../services/accounts";
import type { InputMethod, TransactionType } from "../../../services/transactions";

// ────────────────────────────────────────────────
// Domain: Transaction display model (UI-layer DTO)
// ────────────────────────────────────────────────

/** Fully resolved transaction ready for UI rendering — no raw DB joins needed. */
export interface DetailedTransactionItem {
  id: string;
  name: string;
  note?: string | null;
  time: string;
  dateStr: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  categoryIcon: string;
  accountName: string;
  currency: string;
  inputMethod: InputMethod;
  avatarBg: string;
}

// ────────────────────────────────────────────────
// Hook: useHomeScreenData return contract
// ────────────────────────────────────────────────

/** Full data contract exposed by useHomeScreenData to the HomeScreen. */
export interface HomeScreenData {
  // User
  userName: string;
  userImageUrl: string | undefined;

  // Account
  accounts: AccountWithBalance[];
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  currentAccount: AccountWithBalance | null;
  activeBalance: number;
  totalBalance: number;
  activeCurrency: string;
  accountLabel: string;

  // Monthly metrics
  monthlyIncome: number;
  monthlyExpenses: number;
  totalBudget: number;
  remainingBudget: number;
  budgetProgressPercent: number;
  dailyAllowance: number;
  daysRemaining: number;
  cycleMonthName: string;

  // Feed
  feedTransactions: DetailedTransactionItem[];

  // Query states
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

// ────────────────────────────────────────────────
// Component Props
// ────────────────────────────────────────────────

export interface TransactionRowItemProps {
  item: DetailedTransactionItem;
  onPress: (item: DetailedTransactionItem) => void;
}

export interface TransactionDetailModalProps {
  transaction: DetailedTransactionItem | null;
  onClose: () => void;
  onDelete?: (transaction: DetailedTransactionItem) => void;
  onEdit?: (transaction: DetailedTransactionItem) => void;
}

export interface AccountSwitcherModalProps {
  visible: boolean;
  accounts: AccountWithBalance[];
  selectedAccountId: string | null;
  totalBalance: number;
  baseCurrency: string;
  onSelectAccount: (accountId: string | null) => void;
  onClose: () => void;
}
