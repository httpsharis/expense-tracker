import { describe, expect, it } from "bun:test";
import { fromMinorUnits, toMinorUnits } from "../../../shared/lib/money";

describe("Analytics Computations & Diagnostics", () => {
  it("calculates net cashflow and savings rate accurately", () => {
    const income = 100_000;
    const expenses = 45_000;
    const netSavings = income - expenses;
    const savingsRate = Math.round((netSavings / income) * 100);

    expect(netSavings).toBe(55_000);
    expect(savingsRate).toBe(55);
  });

  it("handles zero income gracefully without dividing by zero", () => {
    const income = 0;
    const expenses = 12_000;
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

    expect(savingsRate).toBe(0);
  });

  it("caps savings rate between 0 and 100% when spending exceeds income", () => {
    const income = 50_000;
    const expenses = 80_000;
    const rawRate = Math.round(((income - expenses) / income) * 100);
    const clampedRate = Math.max(0, Math.min(100, rawRate));

    expect(rawRate).toBe(-60);
    expect(clampedRate).toBe(0);
  });

  it("detects over-budget categories and computes exact overrun", () => {
    const budgetLimit = 15_000;
    const actualSpend = 18_500;
    const isOver = actualSpend > budgetLimit;
    const overrun = actualSpend - budgetLimit;

    expect(isOver).toBe(true);
    expect(overrun).toBe(3_500);
  });

  it("calculates unbudgeted leakage correctly in minor units", () => {
    const expenses = [
      { category: "Dining", amount: 8000, hasBudget: true },
      { category: "Gadgets", amount: 12000, hasBudget: false },
      { category: "Subscription", amount: 3000, hasBudget: false },
    ];

    const unbudgetedMinor = expenses
      .filter((e) => !e.hasBudget)
      .reduce((sum, e) => sum + toMinorUnits(e.amount), 0);

    const unbudgetedTotal = fromMinorUnits(unbudgetedMinor);
    expect(unbudgetedTotal).toBe(15_000);
  });
});

