import { z } from "zod";
import { toMinorUnits } from "@shared/lib/money";
import type {
  AssistantContext,
  BatchTransactionsProposal,
  GeminiFunctionDeclaration,
  TransactionLogItem,
} from "../types";
import {
  MAX_DESCRIPTION_CHARS,
  MAX_MONETARY_AMOUNT,
  MAX_PERSON_NAME_CHARS,
} from "./splits";

export const MAX_BATCH_TRANSACTIONS = 10;
export const MAX_REASON_CHARS = 200;

export const logTransactionItemSchema = z.object({
  amount: z
    .number()
    .finite()
    .positive("Amount must be greater than zero.")
    .max(MAX_MONETARY_AMOUNT, "Amount cannot exceed 10,000,000."),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(MAX_DESCRIPTION_CHARS, "Description cannot exceed 120 characters."),
  type: z.enum(["expense", "income"]),
  category: z.string().trim().min(1).max(MAX_PERSON_NAME_CHARS).optional(),
  account: z.string().trim().min(1).max(MAX_PERSON_NAME_CHARS).optional(),
});

export const logTransactionsSchema = z.object({
  items: z
    .array(logTransactionItemSchema)
    .min(1, "At least 1 transaction item is required.")
    .max(MAX_BATCH_TRANSACTIONS, "Cannot log more than 10 transactions at once."),
});

export type LogTransactionsInput = z.infer<typeof logTransactionsSchema>;

export const proposeDeleteTransactionSchema = z.object({
  transaction_id: z.string().trim().min(1, "Transaction ID is required.").max(120),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required.")
    .max(MAX_REASON_CHARS, "Reason cannot exceed 200 characters."),
});

export type ProposeDeleteTransactionInput = z.infer<
  typeof proposeDeleteTransactionSchema
>;

export function resolveAccountFromContext(
  accountName: string | undefined,
  context: Pick<AssistantContext, "accounts">,
): { id: string; name: string } {
  if (context.accounts.length === 0) {
    throw new Error("No accounts exist yet. Please create an account first.");
  }

  if (accountName) {
    const normalized = accountName.trim().toLowerCase();
    const matched = context.accounts.find(
      (account) =>
        account.name.toLowerCase() === normalized ||
        account.name.toLowerCase().includes(normalized),
    );
    if (matched) {
      return { id: matched.id, name: matched.name };
    }
  }

  const primary = context.accounts[0];
  return { id: primary.id, name: primary.name };
}

export function resolveCategoryFromContext(
  categoryName: string | undefined,
  type: "expense" | "income",
  context: Pick<AssistantContext, "categories">,
): { id: string; name: string } {
  const defaultId = type === "income" ? "cat-6" : "cat-1";
  const defaultName =
    type === "income" ? "Salary / Income" : "Food & Dining";

  if (categoryName) {
    const normalized = categoryName.trim().toLowerCase();
    const matched = context.categories.find(
      (category) =>
        category.name.toLowerCase() === normalized ||
        category.name.toLowerCase().includes(normalized) ||
        normalized.includes(category.name.toLowerCase()),
    );
    if (matched) {
      return { id: matched.id, name: matched.name };
    }
  }

  const fallback = context.categories[0];

  return fallback
    ? { id: fallback.id, name: fallback.name }
    : { id: defaultId, name: defaultName };
}

export function buildBatchTransactionsProposal(
  rawArgs: unknown,
  context: Pick<AssistantContext, "accounts" | "categories">,
): BatchTransactionsProposal {
  const parsed = logTransactionsSchema.parse(rawArgs);
  let totalExpenseMinor = 0;
  let totalIncomeMinor = 0;

  const items: TransactionLogItem[] = parsed.items.map((item) => {
    const amountMinor = toMinorUnits(item.amount);
    if (item.type === "expense") {
      totalExpenseMinor += amountMinor;
    } else {
      totalIncomeMinor += amountMinor;
    }

    const account = resolveAccountFromContext(item.account, context);
    const category = resolveCategoryFromContext(
      item.category,
      item.type,
      context,
    );

    return {
      amount: item.amount,
      amountMinor,
      description: item.description,
      type: item.type,
      categoryId: category.id,
      categoryName: category.name,
      accountId: account.id,
      accountName: account.name,
    };
  });

  return {
    kind: "log_transactions",
    items,
    totalExpenseMinor,
    totalIncomeMinor,
  };
}

export const LOG_TRANSACTIONS_DECLARATION: GeminiFunctionDeclaration = {
  name: "log_transactions",
  description:
    "Log one or more personal expense or income transactions (1 to 10 items). Single-item logs execute immediately; multi-item batches show a confirmation preview.",
  parameters: {
    type: "OBJECT",
    properties: {
      items: {
        type: "ARRAY",
        description: "List of 1 to 10 transactions to record.",
        items: {
          type: "OBJECT",
          properties: {
            amount: {
              type: "NUMBER",
              description: "Positive transaction amount in major currency units.",
            },
            description: {
              type: "STRING",
              description: "Short merchant or item description (e.g. 'Coffee', 'Lunch').",
            },
            type: {
              type: "STRING",
              enum: ["expense", "income"],
              description: "Whether money was spent ('expense') or received ('income').",
            },
            category: {
              type: "STRING",
              description: "Category name (e.g. 'Food & Dining', 'Transport', 'Shopping').",
            },
            account: {
              type: "STRING",
              description: "Optional account name to debit or credit.",
            },
          },
          required: ["amount", "description", "type"],
        },
      },
    },
    required: ["items"],
  },
};

export const PROPOSE_DELETE_TRANSACTION_DECLARATION: GeminiFunctionDeclaration =
  {
    name: "propose_delete_transaction",
    description:
      "Propose reversing/deleting an existing transaction by its ID. Always requires user confirmation.",
    parameters: {
      type: "OBJECT",
      properties: {
        transaction_id: {
          type: "STRING",
          description: "The ID of the transaction from recentTransactions.",
        },
        reason: {
          type: "STRING",
          description: "Clear explanation of which transaction is being deleted and why.",
        },
      },
      required: ["transaction_id", "reason"],
    },
  };

