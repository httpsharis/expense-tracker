import { describe, expect, it } from "bun:test";
import {
  addMoney,
  applySettlement,
  calculateSettlementState,
  computeSplitShares,
  fromMinorUnits,
  subtractMoney,
  sumMoney,
  toMinorUnits,
} from "../money";

describe("money minor-unit helpers", () => {
  it("converts major to minor units and back without float drift", () => {
    expect(toMinorUnits(0.1) + toMinorUnits(0.2)).toBe(30);
    expect(fromMinorUnits(toMinorUnits(0.1) + toMinorUnits(0.2))).toBe(0.3);
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(subtractMoney(33.33, 10.1)).toBe(23.23);
    expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
  });

  it("(a) even split rounding (1000 / 3) sums to 1000 exactly", () => {
    const shares = computeSplitShares({
      totalAmount: 1000,
      participants: ["You", "Ali", "Sara"],
      payerName: "You",
      splitMode: "equal",
    });

    const totalFromShares = sumMoney(shares.map((share) => share.amount));
    const totalMinorFromShares = shares.reduce((acc, share) => acc + share.amountMinor, 0);

    expect(totalFromShares).toBe(1000);
    expect(totalMinorFromShares).toBe(100000);
    expect(shares.map((share) => share.amount)).toEqual([333.34, 333.33, 333.33]);
  });

  it("(b) assigns the rounding remainder to the payer when a friend paid", () => {
    const shares = computeSplitShares({
      totalAmount: 1000,
      participants: ["You", "Ali", "Sara"],
      payerName: "Ali",
      splitMode: "equal",
    });

    const payerShare = shares.find((share) => share.name === "Ali");
    const yourShare = shares.find((share) => share.name === "You");
    const saraShare = shares.find((share) => share.name === "Sara");

    expect(payerShare?.amount).toBe(333.34);
    expect(yourShare?.amount).toBe(333.33);
    expect(saraShare?.amount).toBe(333.33);
    expect(sumMoney(shares.map((share) => share.amount))).toBe(1000);
  });

  it("(c) partial settlement updates remaining amount and status accurately", () => {
    const firstStep = applySettlement(100, [], 40);
    expect(firstStep.appliedAmount).toBe(40);
    expect(firstStep.remainingAmount).toBe(60);
    expect(firstStep.status).toBe("partial");
    expect(firstStep.isSettled).toBe(false);

    const stateAfterFirst = calculateSettlementState(100, [40]);
    expect(stateAfterFirst.remainingAmount).toBe(60);
    expect(stateAfterFirst.status).toBe("partial");
  });

  it("(d) zero, negative, or non-finite settle amounts throw an error", () => {
    expect(() => applySettlement(100, [], 0)).toThrow(
      "Settlement amount must be a positive number.",
    );
    expect(() => applySettlement(100, [], -25)).toThrow(
      "Settlement amount must be a positive number.",
    );
    expect(() => applySettlement(100, [], Number.NaN)).toThrow(
      "Settlement amount must be a positive number.",
    );
    expect(() => applySettlement(100, [], Number.POSITIVE_INFINITY)).toThrow(
      "Settlement amount must be a positive number.",
    );
  });

  it("(e) classic floating-point edge cases (0.1 + 0.2 and 33.33 - 10.10 - 23.23) settle to 0", () => {
    const pointThreeCase = applySettlement(0.3, [0.1], 0.2);
    expect(pointThreeCase.remainingMinor).toBe(0);
    expect(pointThreeCase.remainingAmount).toBe(0);
    expect(pointThreeCase.status).toBe("settled");
    expect(pointThreeCase.isSettled).toBe(true);

    const splitRestCase = applySettlement(33.33, [10.1], 23.23);
    expect(splitRestCase.remainingMinor).toBe(0);
    expect(splitRestCase.remainingAmount).toBe(0);
    expect(splitRestCase.status).toBe("settled");
    expect(splitRestCase.isSettled).toBe(true);
  });
});

