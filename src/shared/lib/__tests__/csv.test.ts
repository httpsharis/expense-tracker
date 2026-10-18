import { describe, expect, it } from "bun:test";
import { buildTransactionsCsv, escapeCsvCell } from "../csv";

describe("CSV export escaping & formula injection protection", () => {
  it("neutralizes spreadsheet formula triggers (=, +, -, @)", () => {
    expect(escapeCsvCell("=SUM(A1:A10)")).toBe("\"'=SUM(A1:A10)\"");
    expect(escapeCsvCell("+12345")).toBe("\"'+12345\"");
    expect(escapeCsvCell("-500")).toBe("\"'-500\"");
    expect(escapeCsvCell("@HYPERLINK(\"http://evil.example\")")).toBe(
      "\"'@HYPERLINK(\"\"http://evil.example\"\")\"",
    );
  });

  it("escapes commas, double quotes, and newlines inside cells", () => {
    expect(escapeCsvCell('Dinner at "Bistro", Lahore\nTable 4')).toBe(
      '"Dinner at ""Bistro"", Lahore\nTable 4"',
    );
  });

  it("builds a full CSV with Currency and Status columns", () => {
    const csv = buildTransactionsCsv(
      [
        {
          account_id: "acc-1",
          category_id: "cat-1",
          amount: 1250.5,
          type: "expense",
          status: "completed",
          date: "2026-10-11",
          description: '=CMD|" /C calc"!A0',
        },
      ],
      new Map([["cat-1", "Food, Dining"]]),
      new Map([["acc-1", { name: 'Main "Cash" Vault', currency: "PKR" }]]),
      "PKR",
    );

    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Date,Description,Category,Account,Type,Amount,Currency,Status",
    );
    expect(lines[1]).toBe(
      '"2026-10-11","\'=CMD|"" /C calc""!A0","Food, Dining","Main ""Cash"" Vault","expense","1250.50","PKR","completed"',
    );
  });
});

