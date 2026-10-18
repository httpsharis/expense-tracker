import type { DetailedTransactionItem } from "@shared/types/models";
import type { AccountWithBalance } from "../../../services/accounts";
import type { TransactionWithCategory } from "../../../services/transactions";

export type { DetailedTransactionItem } from "@shared/types/models";

export interface CategoryAllocation {
  id: string;
  name: string;
  icon?: string | null;
  spent: number;
  budget: number;
  percent: number;
  color: string;
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
  monthlyNet: number;
  monthStartMode: "remaining" | "zero";
  totalBudget: number;
  remainingBudget: number;
  budgetProgressPercent: number;
  dailyAllowance: number;
  daysRemaining: number;
  cycleMonthName: string;

  // Split & Obligation Telemetry (Stitch Bento Cards)
  totalOwedToMe: number;
  totalIOwe: number;
  pendingOwedCount: number;
  pendingDebtors: string[];

  // Category allocations for budget breakdown
  categoryAllocations: CategoryAllocation[];

  // Feed
  feedTransactions: DetailedTransactionItem[];
  rawFeedTransactions: TransactionWithCategory[];

  selectedBudgetName?: string;

  // Query states
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

// ────────────────────────────────────────────────
// Component Props
// ────────────────────────────────────────────────

export interface AccountSwitcherModalProps {
  visible: boolean;
  accounts: AccountWithBalance[];
  selectedAccountId: string | null;
  totalBalance: number;
  baseCurrency: string;
  onSelectAccount: (accountId: string | null) => void;
  onClose: () => void;
}
