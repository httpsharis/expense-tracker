import { Category } from "../../../services/categories";

export type BudgetPeriod = "day" | "week" | "month" | "year" | "custom";

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category_id?: string | null;
  account_id?: string | null;
  period_type: BudgetPeriod;
  period_start?: string | null;
  period_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetWithDerived extends Budget {
  spent: number;
  remaining: number;
  percent: number;
  isExceeded: boolean;
  periodLabel: string;
  matchingTransactionCount: number;
  daysRemaining: number;
  daysTotal: number;
  safeDailySpend: number;
  timePercent: number;
  pacingStatus: "under" | "on_track" | "warning" | "exceeded";
  category?: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
  account?: {
    id: string;
    name: string;
    currency?: string;
  } | null;
}


export interface SaveBudgetPayload {
  id?: string;
  name: string;
  amount: number;
  period_type: BudgetPeriod;
  category_id?: string | null;
  account_id?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

export interface BudgetCardProps {
  item: BudgetWithDerived;
  currency?: string;
  onPress: () => void;
  onEdit?: () => void;
}

export type BudgetCategoryCardProps = BudgetCardProps;


export interface BudgetFormModalProps {
  visible: boolean;
  mode: "create" | "edit";
  categories: Category[];
  accounts: Array<{ id: string; name: string; type: string; currency?: string }>;
  initialBudget?: Partial<SaveBudgetPayload>;
  currency?: string;
  onClose: () => void;
  onSave: (payload: SaveBudgetPayload) => Promise<void>;
  onDelete?: (budgetId: string) => Promise<void>;
  isSaving: boolean;
  budgetId?: string;
  initialCategoryId?: string;
  initialAmount?: number;
  initialType?: any;
  initialConfig?: any;
  monthDate?: string;
  recentTransactions?: any[];
}

export interface BudgetMetrics {
  totalExpenseBudget: number;
  totalExpenseSpent: number;
  remainingExpenseBudget: number;
  overallExpensePercent: number;
  isOverallWarning: boolean;
  isOverallExceeded: boolean;
  expenseCount: number;
  totalSavingsTarget: number;
  totalSavingsSaved: number;
  savingsPercent: number;
  savingsCount: number;
  safeDailySpend: number;
  daysRemaining: number;
  totalCount: number;
}

export interface ActiveCategoryBudget extends BudgetWithDerived {
  budgetId: string;
  categoryId: string;
  icon?: string | null;
  type?: any;
  cap: number;
  overspend?: number;
  isWarning?: boolean;
  isAchieved?: boolean;
  color?: string;
  period?: BudgetPeriod;
  accountId?: string | "all";
  transactionFilter?: any;
  inclusionMode?: any;
  selectedTransactionIds?: string[];
  description?: string;
}

export interface UnbudgetedCategory {
  id: string;
  name: string;
  icon: string | null;
  spent: number;
}

export interface BudgetHeroCardProps {
  metrics: BudgetMetrics;
  currency?: string;
  activeFilter: "all" | "expense" | "savings";
  onSelectFilter: (filter: "all" | "expense" | "savings") => void;
}

export interface BudgetPeriodHeaderProps {
  activeDate: Date;
  daysRemaining: number;
  onAddBudget: () => void;
}

export interface UnbudgetedLeakageCardProps {
  unbudgetedList: UnbudgetedCategory[];
  currency?: string;
  onCapCategory: (categoryId: string) => void;
}


