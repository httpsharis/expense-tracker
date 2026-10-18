import { describe, expect, it } from "bun:test";
import {
  buildTransactionPayload,
  canEditTransaction,
} from "../lib/buildTransactionPayload";

describe("canEditTransaction", () => {
  it("allows full editing for completed non-transfer transactions without splits", () => {
    expect(
      canEditTransaction({
        status: "completed",
        type: "expense",
        is_group: false,
      }),
    ).toEqual({
      canEdit: true,
      canEditAmountAndAccount: true,
      lockReason: null,
    });
  });

  it("blocks editing entirely for cancelled or reversal entries", () => {
    expect(
      canEditTransaction({
        status: "cancelled",
        type: "expense",
      }).canEdit,
    ).toBe(false);
    expect(
      canEditTransaction({
        status: "completed",
        type: "income",
        description: "[Reversal] Lunch",
      }).canEdit,
    ).toBe(false);
  });

  it("locks amount, account, and type for pending, transfer, or split transactions", () => {
    const pendingRes = canEditTransaction({ status: "pending", type: "expense" });
    expect(pendingRes.canEdit).toBe(true);
    expect(pendingRes.canEditAmountAndAccount).toBe(false);

    const transferRes = canEditTransaction({ status: "completed", type: "transfer" });
    expect(transferRes.canEdit).toBe(true);
    expect(transferRes.canEditAmountAndAccount).toBe(false);

    const splitRes = canEditTransaction({
      status: "completed",
      type: "expense",
      isGroup: true,
    });
    expect(splitRes.canEdit).toBe(true);
    expect(splitRes.canEditAmountAndAccount).toBe(false);
  });
});

describe("buildTransactionPayload", () => {
  const fixedNow = new Date("2026-10-12T10:00:00.000Z");

  it("builds a completed expense payload in minor-unit rounded major units", () => {
    const built = buildTransactionPayload({
      mode: "create",
      txType: "expense",
      evaluatedAmount: 450.556,
      sourceAccountId: "acc-1",
      categoryId: "cat-1",
      categoryName: "Food",
      description: "  Dinner  ",
      tags: ["Dining"],
      dateSelection: "today",
      customDate: fixedNow.toISOString(),
      now: fixedNow,
    });

    expect(built.totalAmountMajor).toBe(450.56);
    expect(built.createPayload.amount).toBe(450.56);
    expect(built.createPayload.status).toBe("completed");
    expect(built.createPayload.is_group).toBe(false);
    expect(built.createPayload.description).toBe("Dinner");
    expect(built.createPayload.tags).toEqual(["Dining"]);
  });

  it("computes user share and sets pending status when a friend paid", () => {
    const built = buildTransactionPayload({
      mode: "create",
      txType: "expense",
      evaluatedAmount: 1000,
      sourceAccountId: "acc-1",
      categoryId: "cat-1",
      categoryName: "Food",
      description: "Pizza",
      tags: [],
      dateSelection: "today",
      customDate: fixedNow.toISOString(),
      splitGroupMembers: [{ name: "Ali" }, { name: "Sara" }],
      splitPaidBy: "Ali",
      now: fixedNow,
    });

    expect(built.isFriendPaid).toBe(true);
    expect(built.totalAmountMajor).toBe(1000);
    // 1000 split 3 ways: payer ("Ali") absorbs 333.34, user ("You") owes 333.33
    expect(built.transactionAmountMajor).toBe(333.33);
    expect(built.createPayload.amount).toBe(333.33);
    expect(built.createPayload.status).toBe("pending");
    expect(built.createPayload.is_group).toBe(true);
  });

  it("omits amount, account_id, and type in updatePayload when canEditAmountAndAccount is false", () => {
    const built = buildTransactionPayload({
      mode: "edit",
      txType: "expense",
      evaluatedAmount: 9999,
      sourceAccountId: "acc-2",
      categoryId: "cat-2",
      categoryName: "Dining",
      description: "Updated note",
      tags: ["Trip"],
      dateSelection: "today",
      customDate: fixedNow.toISOString(),
      canEditAmountAndAccount: false,
      now: fixedNow,
    });

    expect(built.updatePayload).toEqual({
      category_id: "cat-2",
      description: "Updated note",
      tags: ["Trip"],
      date: fixedNow.toISOString(),
    });
    expect("amount" in built.updatePayload).toBe(false);
    expect("account_id" in built.updatePayload).toBe(false);
  });

  it("rejects invalid amounts and same-account transfers", () => {
    expect(() =>
      buildTransactionPayload({
        mode: "create",
        txType: "expense",
        evaluatedAmount: 0,
        sourceAccountId: "acc-1",
        categoryId: "cat-1",
        description: "",
        tags: [],
        dateSelection: "today",
        customDate: fixedNow.toISOString(),
      }),
    ).toThrow("Please enter a valid amount greater than 0.");

    expect(() =>
      buildTransactionPayload({
        mode: "create",
        txType: "transfer",
        evaluatedAmount: 500,
        sourceAccountId: "acc-1",
        transferAccountId: "acc-1",
        description: "",
        tags: [],
        dateSelection: "today",
        customDate: fixedNow.toISOString(),
      }),
    ).toThrow("Source and destination accounts must be different.");
  });
});
