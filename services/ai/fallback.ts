import { generateUUID } from "@shared/lib/uuid";
import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";
import {
  computeBudgetStatusFromContext,
  computeFinancialSummaryFromContext,
} from "./tools/queries";
import type { AssistantContext, ToolCallAction } from "./types";

export interface OfflineFallbackResult {
  text: string;
  toolAction?: ToolCallAction;
}

/**
 * Strictly READ-ONLY local fallback used ONLY when the device is offline or the
 * Edge Function is unreachable due to a network error.
 * Never writes, mutates, or proposes deleting ledger data.
 */
export function runReadOnlyOfflineFallback(
  userPrompt: string,
  context: AssistantContext,
): OfflineFallbackResult {
  const lower = userPrompt.toLowerCase();

  if (lower.includes("budget") || lower.includes("limit")) {
    const budgets = computeBudgetStatusFromContext({}, context);
    return {
      text:
        budgets.length > 0
          ? `*(Offline Mode)* You have **${budgets.length}** active budget(s) tracked locally.`
          : `*(Offline Mode)* You do not have any active budgets configured yet.`,
      toolAction: {
        id: generateUUID(),
        type: "tool_result",
        name: "get_budget_status",
        arguments: {},
        status: "executed",
        result: { budgets },
      },
    };
  }

  if (
    lower.includes("balance") ||
    lower.includes("summary") ||
    lower.includes("worth") ||
    lower.includes("how much")
  ) {
    const summary = computeFinancialSummaryFromContext(
      { period: "this_month" },
      context,
    );
    const totalWorthMinor = context.accounts.reduce(
      (sumMinor, account) => sumMinor + toMinorUnits(Number(account.balance ?? 0)),
      0,
    );
    const totalLiquidNetWorth = fromMinorUnits(totalWorthMinor);
    const accounts = context.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: Number(account.balance ?? 0),
      currency: account.currency,
    }));

    return {
      text: `*(Offline Mode)* Your total balance across **${accounts.length}** account(s) is **${totalLiquidNetWorth.toLocaleString()} ${context.currency}**.`,
      toolAction: {
        id: generateUUID(),
        type: "tool_result",
        name: "get_financial_summary",
        arguments: { period: "this_month" },
        status: "executed",
        result: {
          summary,
          total_liquid_net_worth: totalLiquidNetWorth,
          accounts,
        },
      },
    };
  }

  return {
    text: "Saldo AI is currently unreachable. While offline, I can only check your balances and budgets—recording transactions, splits, or reversals requires an active connection.",
  };
}

