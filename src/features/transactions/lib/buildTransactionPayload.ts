import type { GroupMember } from "@services/splits";
import type { TransactionInsert, TransactionType } from "@services/transactions";
import { parseLocalDate } from "@shared/lib/dates";
import { computeSplitShares, fromMinorUnits, toMinorUnits } from "@shared/lib/money";

export interface EditableTransactionCheckInput {
  status?: string | null;
  type?: string | null;
  isReversal?: boolean;
  isGroup?: boolean;
  is_group?: boolean;
  description?: string | null;
  name?: string | null;
}

export interface TransactionEditEligibility {
  canEdit: boolean;
  canEditAmountAndAccount: boolean;
  lockReason: string | null;
}

const ONE_DAY_MS = 86_400_000;

export function canEditTransaction(
  transaction?: EditableTransactionCheckInput | null,
): TransactionEditEligibility {
  if (!transaction) {
    return { canEdit: false, canEditAmountAndAccount: false, lockReason: null };
  }
  const label = transaction.description ?? transaction.name ?? "";
  const isReversal = Boolean(transaction.isReversal || label.startsWith("[Reversal]"));
  if (transaction.status === "cancelled" || isReversal) {
    return {
      canEdit: false,
      canEditAmountAndAccount: false,
      lockReason: "Reversed or cancelled transactions cannot be edited.",
    };
  }
  if (transaction.status === "pending") {
    return {
      canEdit: true,
      canEditAmountAndAccount: false,
      lockReason: "Amount, account, and type are locked for pending friend-paid splits.",
    };
  }
  if (transaction.type === "transfer") {
    return {
      canEdit: true,
      canEditAmountAndAccount: false,
      lockReason: "Amount, account, and type are locked for transfers.",
    };
  }
  if (transaction.isGroup || transaction.is_group) {
    return {
      canEdit: true,
      canEditAmountAndAccount: false,
      lockReason: "Amount, account, and type are locked for split transactions.",
    };
  }
  return { canEdit: true, canEditAmountAndAccount: true, lockReason: null };
}

export function resolveTransactionDateIso(
  dateSelection: "today" | "yesterday" | "custom",
  customDate: string,
  now = new Date(),
): string {
  if (dateSelection === "yesterday") {
    return new Date(now.getTime() - ONE_DAY_MS).toISOString();
  }
  if (dateSelection === "custom") {
    const parsed = parseLocalDate(customDate);
    return Number.isNaN(parsed.getTime()) ? now.toISOString() : parsed.toISOString();
  }
  return now.toISOString();
}

export interface BuildTransactionPayloadInput {
  mode: "create" | "edit";
  txType: TransactionType;
  evaluatedAmount: number;
  sourceAccountId?: string | null;
  transferAccountId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  description: string;
  tags: string[];
  dateSelection: "today" | "yesterday" | "custom";
  customDate: string;
  splitPerson?: string | null;
  splitGroupMembers?: Pick<GroupMember, "name">[] | null;
  splitPaidBy?: string;
  canEditAmountAndAccount?: boolean;
  now?: Date;
}

export interface BuiltTransactionPayload {
  totalAmountMajor: number;
  transactionAmountMajor: number;
  isFriendPaid: boolean;
  cleanDescription: string;
  createPayload: Omit<TransactionInsert, "user_id">;
  updatePayload: Partial<TransactionInsert>;
}

export function buildTransactionPayload(
  input: BuildTransactionPayloadInput,
): BuiltTransactionPayload {
  const canEditMoney = input.mode === "create" || (input.canEditAmountAndAccount ?? true);
  const amountMinor = toMinorUnits(input.evaluatedAmount);

  if (canEditMoney && (!Number.isFinite(input.evaluatedAmount) || amountMinor <= 0)) {
    throw new Error("Please enter a valid amount greater than 0.");
  }
  if (canEditMoney && !input.sourceAccountId) {
    throw new Error("Please choose a funding account.");
  }
  if (input.txType === "expense" && !input.categoryId) {
    throw new Error("Please choose a spending category.");
  }
  if (canEditMoney && input.txType === "transfer") {
    if (!input.transferAccountId) {
      throw new Error("Please choose where to send funds.");
    }
    if (input.transferAccountId === input.sourceAccountId) {
      throw new Error("Source and destination accounts must be different.");
    }
  }

  const totalAmountMajor = fromMinorUnits(Math.max(0, amountMinor));
  const cleanDescription = input.description.trim();
  const defaultLabel =
    input.txType === "income"
      ? "Deposit"
      : input.txType === "transfer"
        ? "Account Transfer"
        : input.categoryName || "General Expense";
  const fullDescription = cleanDescription || defaultLabel;
  const dateIso = resolveTransactionDateIso(
    input.dateSelection,
    input.customDate,
    input.now,
  );

  const hasSplit = Boolean(input.splitPerson || (input.splitGroupMembers && input.splitGroupMembers.length > 0));
  const payerName = input.splitPaidBy || "You";
  const isFriendPaid =
    input.mode === "create" &&
    input.txType === "expense" &&
    hasSplit &&
    payerName !== "You";

  let transactionAmountMajor = totalAmountMajor;
  if (isFriendPaid) {
    const participants = input.splitPerson
      ? ["You", input.splitPerson]
      : [
          "You",
          ...(input.splitGroupMembers ?? [])
            .map((member) => member.name.trim())
            .filter((name) => name.toLowerCase() !== "you"),
        ];
    const shares = computeSplitShares({
      totalAmount: totalAmountMajor,
      participants,
      payerName,
      splitMode: "equal",
    });
    transactionAmountMajor =
      shares.find((share) => share.name.toLowerCase() === "you")?.amount ??
      totalAmountMajor;
  }

  const categoryIdOrNull =
    input.txType === "transfer" ? null : input.categoryId || null;

  const createPayload: Omit<TransactionInsert, "user_id"> = {
    account_id: input.sourceAccountId || "",
    transfer_account_id:
      input.txType === "transfer" ? input.transferAccountId || null : null,
    amount: transactionAmountMajor,
    type: input.txType,
    category_id: categoryIdOrNull,
    description: fullDescription,
    tags: input.tags,
    status: isFriendPaid ? "pending" : "completed",
    is_group: input.txType === "expense" && hasSplit,
    input_method: "manual",
    date: dateIso,
  };

  const updatePayload: Partial<TransactionInsert> = canEditMoney
    ? {
        account_id: input.sourceAccountId || undefined,
        transfer_account_id:
          input.txType === "transfer" ? input.transferAccountId || null : null,
        amount: totalAmountMajor,
        type: input.txType,
        category_id: categoryIdOrNull,
        description: fullDescription,
        tags: input.tags,
        date: dateIso,
      }
    : {
        category_id: categoryIdOrNull,
        description: fullDescription,
        tags: input.tags,
        date: dateIso,
      };

  return {
    totalAmountMajor,
    transactionAmountMajor,
    isFriendPaid,
    cleanDescription,
    createPayload,
    updatePayload,
  };
}
