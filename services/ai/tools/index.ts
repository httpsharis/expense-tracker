import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import { generateUUID } from "@shared/lib/uuid";
import type { Database } from "@shared/types/database.types";
import {
  createDirectLoan,
  createDirectPeopleSplit,
  createGroup,
} from "../../splits";
import {
  createTransaction,
  getTransactions,
  reverseTransaction,
  type TransactionWithCategory,
} from "../../transactions";
import type { ToolExecutionOutcome } from "../agentLoop";
import { cleanPersonName, resolvePerson } from "../resolvePerson";
import type {
  AssistantContext,
  DeleteTransactionProposal,
  GeminiFunctionDeclaration,
  GeminiToolConfig,
  LoanProposal,
  ToolCallAction,
  ToolName,
} from "../types";
import { CREATE_GROUP_DECLARATION, createGroupSchema } from "./groups";
import {
  computeBudgetStatusFromContext,
  computeFinancialSummaryFromContext,
  GET_BUDGET_STATUS_DECLARATION,
  GET_FINANCIAL_SUMMARY_DECLARATION,
  getBudgetStatusSchema,
  getFinancialSummarySchema,
} from "./queries";
import {
  buildSplitExpenseProposal,
  CREATE_LOAN_DECLARATION,
  CREATE_SPLIT_EXPENSE_DECLARATION,
  createLoanSchema,
  createSplitExpenseSchema,
  MAX_DESCRIPTION_CHARS,
} from "./splits";
import {
  buildBatchTransactionsProposal,
  LOG_TRANSACTIONS_DECLARATION,
  logTransactionsSchema,
  PROPOSE_DELETE_TRANSACTION_DECLARATION,
  proposeDeleteTransactionSchema,
  resolveAccountFromContext,
  resolveCategoryFromContext,
} from "./transactions";

export * from "./groups";
export * from "./queries";
export * from "./splits";
export * from "./transactions";

/**
 * Wraps untrusted user-supplied text in <user_data> tags after stripping any
 * embedded closing/opening <user_data> tags so prompt-delimiter breakout is impossible.
 */
export function wrapUserData(rawText: string | null | undefined): string {
  const sanitized = String(rawText ?? "")
    .replace(/<\/?user_data>/gi, "")
    .trim();
  return `<user_data>${sanitized}</user_data>`;
}

export const queryTransactionsSchema = z.object({
  limit: z.number().int().min(1).max(20).optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  search: z.string().trim().max(MAX_DESCRIPTION_CHARS).optional(),
});

export const QUERY_TRANSACTIONS_DECLARATION: GeminiFunctionDeclaration = {
  name: "query_transactions",
  description:
    "Search and filter the user's recent transactions by type, keyword, or limit (max 20).",
  parameters: {
    type: "OBJECT",
    properties: {
      limit: {
        type: "NUMBER",
        description: "Maximum number of transactions to return (default 5, max 20).",
      },
      type: {
        type: "STRING",
        enum: ["income", "expense", "transfer"],
        description: "Optional transaction type filter.",
      },
      search: {
        type: "STRING",
        description: "Optional keyword to match in transaction descriptions.",
      },
    },
    required: [],
  },
};

export interface ToolRegistryEntry {
  declaration: GeminiFunctionDeclaration;
  schema: z.ZodTypeAny;
  needsConfirmation: boolean;
}

export const TOOL_REGISTRY: Record<string, ToolRegistryEntry> = {
  get_financial_summary: {
    declaration: GET_FINANCIAL_SUMMARY_DECLARATION,
    schema: getFinancialSummarySchema,
    needsConfirmation: false,
  },
  query_transactions: {
    declaration: QUERY_TRANSACTIONS_DECLARATION,
    schema: queryTransactionsSchema,
    needsConfirmation: false,
  },
  get_budget_status: {
    declaration: GET_BUDGET_STATUS_DECLARATION,
    schema: getBudgetStatusSchema,
    needsConfirmation: false,
  },
  log_transactions: {
    declaration: LOG_TRANSACTIONS_DECLARATION,
    schema: logTransactionsSchema,
    needsConfirmation: false,
  },
  create_split_expense: {
    declaration: CREATE_SPLIT_EXPENSE_DECLARATION,
    schema: createSplitExpenseSchema,
    needsConfirmation: true,
  },
  create_group: {
    declaration: CREATE_GROUP_DECLARATION,
    schema: createGroupSchema,
    needsConfirmation: false,
  },
  create_loan: {
    declaration: CREATE_LOAN_DECLARATION,
    schema: createLoanSchema,
    needsConfirmation: true,
  },
  propose_delete_transaction: {
    declaration: PROPOSE_DELETE_TRANSACTION_DECLARATION,
    schema: proposeDeleteTransactionSchema,
    needsConfirmation: true,
  },
};

export function isValidToolName(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, name);
}

export const GEMINI_TOOL_DECLARATIONS: GeminiToolConfig[] = [
  {
    functionDeclarations: Object.values(TOOL_REGISTRY).map(
      (entry) => entry.declaration,
    ),
  },
];

/**
 * Validates and executes a single model tool call against the live assistant context.
 */
export async function executeToolCall(
  supabase: SupabaseClient<Database>,
  context: AssistantContext,
  rawName: string,
  rawArgs: Record<string, unknown>,
): Promise<ToolExecutionOutcome> {
  const normalizedName =
    rawName === "check_budgets"
      ? "get_budget_status"
      : rawName === "delete_transaction"
        ? "propose_delete_transaction"
        : rawName;

  if (!isValidToolName(normalizedName)) {
    throw new Error(`Unsupported tool "${rawName}".`);
  }

  const actionId = generateUUID();

  if (normalizedName === "get_financial_summary") {
    const summaryArgs =
      rawArgs && typeof rawArgs.period === "string"
        ? rawArgs
        : { period: "this_month" };
    const summary = computeFinancialSummaryFromContext(summaryArgs, context);
    const totalWorthMinor = context.accounts.reduce(
      (sumMinor, account) => sumMinor + toMinorUnits(Number(account.balance ?? 0)),
      0,
    );
    const totalLiquidNetWorth = fromMinorUnits(totalWorthMinor);
    const accountsList = context.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: Number(account.balance ?? 0),
      currency: account.currency,
    }));

    const resultPayload = {
      summary,
      total_liquid_net_worth: totalLiquidNetWorth,
      accounts: accountsList,
    };

    return {
      status: "executed",
      response: resultPayload,
      summary: `Total balance is ${totalLiquidNetWorth} ${context.currency}. ${summary.period} income: ${summary.totalIncome}, expenses: ${summary.totalExpense}.`,
      action: {
        id: actionId,
        type: "tool_result",
        name: "get_financial_summary",
        arguments: summaryArgs,
        status: "executed",
        result: resultPayload,
      },
    };
  }

  if (normalizedName === "query_transactions") {
    const parsed = queryTransactionsSchema.parse(rawArgs ?? {});
    const limit = parsed.limit ?? 5;
    const txs = await getTransactions(supabase, context.userId, {
      limit,
      type: parsed.type ?? null,
    });

    const searchLower = parsed.search?.toLowerCase();
    const filtered = searchLower
      ? txs.filter((tx) =>
          (tx.description ?? "").toLowerCase().includes(searchLower),
        )
      : txs;

    const safeTransactions = filtered.map((tx) => ({
      id: tx.id,
      date: tx.date?.slice(0, 10) ?? "",
      description: wrapUserData(tx.description || "Transaction"),
      amount: tx.amount,
      type: tx.type,
      status: tx.status,
      category: wrapUserData(tx.category?.name || "Uncategorized"),
      account: wrapUserData(tx.account?.name || "Account"),
    }));

    return {
      status: "executed",
      response: {
        count: safeTransactions.length,
        transactions: safeTransactions,
      },
      summary: `Found ${safeTransactions.length} transaction(s).`,
    };
  }

  if (normalizedName === "get_budget_status") {
    const budgets = computeBudgetStatusFromContext(rawArgs ?? {}, context).map(
      (item) => ({
        ...item,
        category: wrapUserData(item.category),
      }),
    );

    return {
      status: "executed",
      response: { count: budgets.length, budgets },
      summary:
        budgets.length > 0
          ? `Checked ${budgets.length} budget(s).`
          : "No active budgets configured yet.",
      action: {
        id: actionId,
        type: "tool_result",
        name: "get_budget_status",
        arguments: rawArgs,
        status: "executed",
        result: { budgets },
      },
    };
  }

  if (normalizedName === "log_transactions") {
    const proposal = buildBatchTransactionsProposal(rawArgs, context);

    if (proposal.items.length === 1) {
      const item = proposal.items[0];
      const created = await createTransaction(supabase, {
        user_id: context.userId,
        account_id: item.accountId,
        category_id: item.categoryId,
        amount: item.amount,
        type: item.type,
        description: item.description,
        date: new Date().toISOString(),
        status: "completed",
        input_method: "voice",
      });

      const txWithMeta: TransactionWithCategory = {
        ...created,
        category: { id: item.categoryId, name: item.categoryName, icon: null },
        account: {
          id: item.accountId,
          name: item.accountName,
          currency: context.currency,
        },
      };

      return {
        status: "executed",
        response: {
          status: "logged",
          transaction: {
            id: created.id,
            description: created.description,
            amount: created.amount,
            type: created.type,
            account_name: item.accountName,
            category_name: item.categoryName,
          },
        },
        summary: `Logged ${item.type} of ${item.amount} ${context.currency} for "${item.description}" on ${item.accountName}.`,
        action: {
          id: actionId,
          type: "tool_result",
          name: "log_transactions",
          arguments: rawArgs,
          status: "executed",
          result: {
            transaction: txWithMeta,
            transactions: [txWithMeta],
          },
        },
      };
    }

    const totalOut = fromMinorUnits(proposal.totalExpenseMinor);
    const totalIn = fromMinorUnits(proposal.totalIncomeMinor);
    const summaryText = `Prepared ${proposal.items.length} transactions (${totalOut > 0 ? `${totalOut} ${context.currency} expenses` : ""}${totalOut > 0 && totalIn > 0 ? ", " : ""}${totalIn > 0 ? `${totalIn} ${context.currency} income` : ""}). Please confirm to record.`;

    return {
      status: "pending_confirmation",
      response: {
        status: "pending_confirmation",
        item_count: proposal.items.length,
        summary: summaryText,
      },
      summary: summaryText,
      action: {
        id: actionId,
        type: "tool_call",
        name: "log_transactions",
        arguments: rawArgs,
        status: "pending_confirmation",
        summary: summaryText,
        confirmationMessage: summaryText,
        proposal,
        result: { batchProposal: proposal },
      },
    };
  }

  if (normalizedName === "create_split_expense") {
    const splitResult = buildSplitExpenseProposal(
      rawArgs,
      context.knownPeople ?? [],
    );

    if (splitResult.status === "ambiguous_person") {
      return {
        status: "executed",
        response: {
          status: "clarification_needed",
          ambiguous_name: splitResult.inputName,
          candidates: splitResult.candidates,
          message: splitResult.message,
        },
        summary: splitResult.message,
      };
    }

    const resolvedAccount = resolveAccountFromContext(
      splitResult.proposal.accountName,
      context,
    );
    const resolvedCategory = resolveCategoryFromContext(
      splitResult.proposal.categoryName,
      "expense",
      context,
    );

    const enrichedProposal = {
      ...splitResult.proposal,
      accountId: resolvedAccount.id,
      accountName: resolvedAccount.name,
      categoryId: resolvedCategory.id,
      categoryName: resolvedCategory.name,
    };

    return {
      status: "pending_confirmation",
      response: {
        status: "pending_confirmation",
        summary: splitResult.summary,
        mode: enrichedProposal.mode,
        my_share: enrichedProposal.myShareAmount,
        owed_to_payer: enrichedProposal.owedToPayerAmount,
      },
      summary: splitResult.summary,
      action: {
        id: actionId,
        type: "tool_call",
        name: "create_split_expense",
        arguments: rawArgs,
        status: "pending_confirmation",
        summary: splitResult.summary,
        confirmationMessage: splitResult.summary,
        proposal: enrichedProposal,
        result: { splitProposal: enrichedProposal },
      },
    };
  }

  if (normalizedName === "create_group") {
    const parsed = createGroupSchema.parse(rawArgs);
    const createdGroup = await createGroup(
      supabase,
      context.userId,
      parsed.name,
      parsed.members,
    );
    const memberNames = createdGroup.members.map((member) => member.name);
    const summaryText = `Created group "${createdGroup.name}" with ${memberNames.join(", ")}.`;

    return {
      status: "executed",
      response: {
        status: "created",
        group: {
          id: createdGroup.id,
          name: createdGroup.name,
          members: memberNames,
        },
      },
      summary: summaryText,
      action: {
        id: actionId,
        type: "tool_result",
        name: "create_group",
        arguments: rawArgs,
        status: "executed",
        summary: summaryText,
        result: {
          group: {
            id: createdGroup.id,
            name: createdGroup.name,
            members: memberNames,
          },
        },
      },
    };
  }

  if (normalizedName === "create_loan") {
    const parsed = createLoanSchema.parse(rawArgs);
    const resolution = resolvePerson(parsed.person, context.knownPeople ?? []);
    if (resolution.status === "ambiguous") {
      const candidates = resolution.candidates.map((person) => person.name);
      const message = `Multiple contacts match "${resolution.inputName}": ${candidates.join(", ")}. Which one is this loan with?`;
      return {
        status: "executed",
        response: {
          status: "clarification_needed",
          ambiguous_name: resolution.inputName,
          candidates,
          message,
        },
        summary: message,
      };
    }

    const personName =
      resolution.status === "matched"
        ? resolution.person.name
        : cleanPersonName(resolution.inputName);
    const resolvedAccount = resolveAccountFromContext(parsed.account, context);
    const amountMinor = toMinorUnits(parsed.amount);
    const normalizedAmount = fromMinorUnits(amountMinor);
    const noteText =
      parsed.note?.trim() ||
      (parsed.direction === "lent"
        ? `Lent to ${personName}`
        : `Borrowed from ${personName}`);

    const loanProposal: LoanProposal = {
      kind: "create_loan",
      personName,
      isNewPerson: resolution.status === "unknown",
      amount: normalizedAmount,
      amountMinor,
      direction: parsed.direction,
      note: noteText,
      accountId: resolvedAccount.id,
      accountName: resolvedAccount.name,
    };

    const summaryText =
      parsed.direction === "lent"
        ? `Loan proposal: You lent ${personName} ${normalizedAmount} ${context.currency} from ${resolvedAccount.name}. Please confirm to record.`
        : `Loan proposal: You borrowed ${normalizedAmount} ${context.currency} from ${personName} into ${resolvedAccount.name}. Please confirm to record.`;

    return {
      status: "pending_confirmation",
      response: {
        status: "pending_confirmation",
        summary: summaryText,
      },
      summary: summaryText,
      action: {
        id: actionId,
        type: "tool_call",
        name: "create_loan",
        arguments: rawArgs,
        status: "pending_confirmation",
        summary: summaryText,
        confirmationMessage: summaryText,
        proposal: loanProposal,
        result: { loanProposal },
      },
    };
  }

  const parsedDelete = proposeDeleteTransactionSchema.parse(rawArgs);
  let targetTx = context.recentTransactions.find(
    (tx) => tx.id === parsedDelete.transaction_id,
  );

  if (!targetTx) {
    const allRecent = await getTransactions(supabase, context.userId, {
      limit: 50,
    });
    targetTx = allRecent.find((tx) => tx.id === parsedDelete.transaction_id);
  }

  if (!targetTx) {
    throw new Error(
      `Transaction "${parsedDelete.transaction_id}" was not found in your ledger.`,
    );
  }

  const deleteProposal: DeleteTransactionProposal = {
    kind: "propose_delete_transaction",
    transaction: targetTx,
    reason: parsedDelete.reason,
  };

  const summaryText = `Confirm reversing "${targetTx.description || "Transaction"}" (${targetTx.amount} ${context.currency})?`;

  return {
    status: "pending_confirmation",
    response: {
      status: "pending_confirmation",
      transaction_id: targetTx.id,
      description: wrapUserData(targetTx.description),
      amount: targetTx.amount,
    },
    summary: summaryText,
    action: {
      id: actionId,
      type: "tool_call",
      name: "propose_delete_transaction",
      arguments: rawArgs,
      status: "pending_confirmation",
      summary: summaryText,
      confirmationMessage: summaryText,
      proposal: deleteProposal,
      result: { transaction: targetTx },
    },
  };
}

/**
 * Executes a pending_confirmation ToolCallAction after explicit user confirmation in the UI.
 * Uses compensating reverseTransaction if a multi-step split write fails midway.
 */
export async function executeConfirmedProposal(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: ToolCallAction,
): Promise<string> {
  const proposal = action.proposal;
  if (!proposal) {
    throw new Error("No proposal payload found on this action.");
  }

  if (proposal.kind === "log_transactions") {
    for (const item of proposal.items) {
      await createTransaction(supabase, {
        user_id: userId,
        account_id: item.accountId,
        category_id: item.categoryId,
        amount: item.amount,
        type: item.type,
        description: item.description,
        date: new Date().toISOString(),
        status: "completed",
        input_method: "voice",
      });
    }
    return `Recorded ${proposal.items.length} transactions in your ledger.`;
  }

  if (proposal.kind === "create_split_expense") {
    if (!proposal.accountId) {
      throw new Error("Missing account for split expense.");
    }

    const isFriendPaid = proposal.mode === "friend_paid";
    const recordedAmount = isFriendPaid
      ? proposal.myShareAmount
      : proposal.totalAmount;
    const descriptionText = isFriendPaid
      ? `${proposal.description} (Paid by ${proposal.paidBy})`
      : proposal.description;

    const createdTx = await createTransaction(supabase, {
      user_id: userId,
      account_id: proposal.accountId,
      category_id: proposal.categoryId ?? null,
      amount: recordedAmount,
      type: "expense",
      description: descriptionText,
      date: new Date().toISOString(),
      status: isFriendPaid ? "pending" : "completed",
      input_method: "voice",
    });

    try {
      const customAmounts: Record<string, number> = {
        You: proposal.myShareAmount,
      };
      for (const participant of proposal.participants) {
        customAmounts[participant.name] = participant.shareAmount;
      }

      await createDirectPeopleSplit(
        supabase,
        userId,
        createdTx.id,
        isFriendPaid
          ? fromMinorUnits(proposal.myShareAmountMinor * 2)
          : proposal.totalAmount,
        proposal.participants.map((participant) => participant.name),
        proposal.description,
        {
          payerName: isFriendPaid ? proposal.paidBy : "You",
          splitMode: "exact",
          customAmounts,
        },
      );
    } catch (splitErr) {
      await reverseTransaction(
        supabase,
        userId,
        { ...createdTx, category: null },
        "Rollback failed split creation",
      ).catch(() => undefined);
      throw splitErr;
    }

    return isFriendPaid
      ? `Recorded split: you owe ${proposal.paidBy} ${proposal.myShareAmount}.`
      : `Recorded split "${proposal.description}" across ${proposal.participantCount} people.`;
  }

  if (proposal.kind === "create_loan") {
    await createDirectLoan(supabase, userId, {
      person_name: proposal.personName,
      direction: proposal.direction === "lent" ? "owed_to_me" : "i_owe",
      amount: proposal.amount,
      account_id: proposal.accountId,
      description: proposal.note,
    });
    return proposal.direction === "lent"
      ? `Recorded loan: ${proposal.personName} owes you ${proposal.amount}.`
      : `Recorded loan: you owe ${proposal.personName} ${proposal.amount}.`;
  }

  if (proposal.kind === "propose_delete_transaction") {
    await reverseTransaction(
      supabase,
      userId,
      proposal.transaction,
      proposal.reason,
    );
    return `Reversed transaction "${proposal.transaction.description || "Transaction"}".`;
  }

  throw new Error("Unsupported proposal kind.");
}

