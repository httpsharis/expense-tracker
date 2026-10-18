import type { Budget } from "@features/budgets/types";
import type { Account } from "@services/accounts";
import type { Category } from "@services/categories";
import type { TransactionWithCategory } from "@services/transactions";

export type ChatMessageRole = "user" | "assistant" | "system";

export type ToolName =
  | "get_financial_summary"
  | "query_transactions"
  | "log_transaction"
  | "log_transactions"
  | "create_split_expense"
  | "create_group"
  | "create_loan"
  | "propose_delete_transaction"
  | "get_budget_status"
  | "check_budgets"
  | "delete_transaction";

export type ToolCallType = ToolName;

export type ToolCallStatus =
  | "pending"
  | "executed"
  | "success"
  | "error"
  | "failed"
  | "pending_confirmation"
  | "confirmed"
  | "cancelled"
  | "rejected";

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiFunctionResponse {
  name: string;
  response: Record<string, unknown>;
}

export interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
  thoughtSignature?: string;
  thought_signature?: string;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface KnownPerson {
  id: string;
  name: string;
  groupId?: string;
}

export interface KnownGroup {
  id: string;
  name: string;
  members: string[];
}

export interface TransactionLogItem {
  amount: number;
  amountMinor: number;
  description: string;
  type: "expense" | "income";
  categoryId: string;
  categoryName: string;
  accountId: string;
  accountName: string;
}

export interface BatchTransactionsProposal {
  kind: "log_transactions";
  items: TransactionLogItem[];
  totalExpenseMinor: number;
  totalIncomeMinor: number;
}

export interface SplitParticipantPreview {
  name: string;
  shareAmount: number;
  shareAmountMinor: number;
  direction: "owed_to_me" | "i_owe";
  isNewPerson: boolean;
}

export interface SplitExpenseProposal {
  kind: "create_split_expense";
  mode: "me_paid" | "friend_paid";
  description: string;
  totalAmount: number;
  totalAmountMinor: number;
  paidBy: string;
  participantCount: number;
  myShareAmount: number;
  myShareAmountMinor: number;
  owedToPayerAmount: number;
  owedToPayerAmountMinor: number;
  participants: SplitParticipantPreview[];
  newPeople: string[];
  groupId?: string;
  groupName?: string;
  categoryId?: string;
  categoryName?: string;
  accountId?: string;
  accountName?: string;
}

export interface DeleteTransactionProposal {
  kind: "propose_delete_transaction";
  transaction: TransactionWithCategory;
  reason: string;
}

export interface LoanProposal {
  kind: "create_loan";
  personName: string;
  isNewPerson: boolean;
  amount: number;
  amountMinor: number;
  direction: "lent" | "borrowed";
  note: string;
  accountId: string;
  accountName: string;
}

export type ToolProposal =
  | BatchTransactionsProposal
  | SplitExpenseProposal
  | DeleteTransactionProposal
  | LoanProposal;

export interface ToolActionResultData {
  [key: string]: unknown;
  transaction?: TransactionWithCategory;
  transactions?: TransactionWithCategory[];
  group?: {
    id: string;
    name: string;
    members: string[];
  };
  splitProposal?: SplitExpenseProposal;
  batchProposal?: BatchTransactionsProposal;
  loanProposal?: LoanProposal;
  summary?: {
    period: string;
    totalIncome: number;
    totalExpense: number;
    netCashflow: number;
    topCategory: string;
  };
  budgets?: {
    category: string;
    spent: number;
    limit: number;
    percentage: number;
  }[];
  error?: string;
}

export interface ToolCallAction {
  id: string;
  type?: "tool_call" | "tool_result";
  name: ToolCallType;
  args?: Record<string, unknown>;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  summary?: string;
  confirmationMessage?: string;
  proposal?: ToolProposal;
  result?: ToolActionResultData;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
  toolAction?: ToolCallAction;
  toolActions?: ToolCallAction[];
  isStreaming?: boolean;
}

export interface AIAgentContext {
  userId: string;
  currency: string;
}

export interface AssistantContext {
  userId: string;
  currency: string;
  accounts: Array<Account & { balance?: number }>;
  categories: Category[];
  recentTransactions: TransactionWithCategory[];
  budgets: Array<Budget & { spent?: number }>;
  knownPeople?: KnownPerson[];
  knownGroups?: KnownGroup[];
}

export interface GeminiFunctionDeclaration {
  name: ToolCallType;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface GeminiToolConfig {
  functionDeclarations: GeminiFunctionDeclaration[];
}

