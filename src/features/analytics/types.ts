export type AnalyticsPeriod =
  | "this_month"
  | "last_30_days"
  | "last_month"
  | "all_time";

export interface CategorySpendBreakdown {
  id: string;
  name: string;
  icon: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
  budgetLimit?: number;
  isOverBudget?: boolean;
}

export type DiagnosticType = "critical" | "warning" | "info" | "positive";

export interface DiagnosticInsight {
  id: string;
  type: DiagnosticType;
  title: string;
  message: string;
  impactAmount?: number;
  categoryName?: string;
}

export interface DaySpendItem {
  date: string;
  dayLabel: string;
  amount: number;
}

export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // 0 to 100
  dailyAvgSpend: number;
  topCategoryName?: string;
  topCategoryPercent?: number;
  currency: string;
  insights: DiagnosticInsight[];
  categoryBreakdown: CategorySpendBreakdown[];
  dailyTrend: DaySpendItem[];
  largestExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    categoryName: string;
    accountName: string;
  }>;
}

