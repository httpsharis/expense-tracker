import { describe, expect, it } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@shared/types/database.types";
import { getAccountsWithBalances, updateAccount, deleteAccount } from "../accounts";
import {
  createTransaction,
  getTransactions,
  reverseTransaction,
} from "../transactions";
import {
  createGroup,
  getGroups,
  settleSplit,
} from "../splits";

// =============================================================================
// In-Memory RLS, Constraint & Trigger Enforcing Supabase Harness
// Simulates PostgreSQL RLS (`auth.jwt()->>'sub'`), CHECK constraints,
// AFTER INSERT triggers (`trg_transaction_balance_entry`, `trg_settlement_balance_entry`),
// and BEFORE UPDATE/DELETE immutability on `balance_entries`.
// =============================================================================

const VALID_BALANCE_REASONS = new Set([
  "transaction",
  "settlement",
  "top_up",
  "adjustment",
  "reversal",
]);

interface HarnessRow {
  id: string;
  user_id?: string;
  [key: string]: unknown;
}

class RlsDatabaseState {
  profiles: HarnessRow[] = [];
  accounts: HarnessRow[] = [];
  categories: HarnessRow[] = [];
  transactions: HarnessRow[] = [];
  balance_entries: HarnessRow[] = [];
  groups: HarnessRow[] = [];
  group_members: HarnessRow[] = [];
  transaction_splits: HarnessRow[] = [];
  settlements: HarnessRow[] = [];

  private nextId = 1;
  genId(prefix: string): string {
    return `${prefix}-${this.nextId++}`;
  }

  isGroupMember(groupId: string, callerId: string): boolean {
    const group = this.groups.find((g) => g.id === groupId);
    if (group && group.user_id === callerId) return true;
    return this.group_members.some(
      (gm) =>
        gm.group_id === groupId &&
        (gm.user_id === callerId || gm.linked_profile_id === callerId),
    );
  }

  canReadRow(table: string, row: HarnessRow, callerId: string): boolean {
    if (table === "profiles") return row.id === callerId;
    if (table === "groups") {
      return row.user_id === callerId || this.isGroupMember(row.id, callerId);
    }
    if (table === "group_members") {
      return (
        row.user_id === callerId ||
        row.linked_profile_id === callerId ||
        this.isGroupMember(String(row.group_id), callerId)
      );
    }
    if (table === "transaction_splits") {
      if (row.user_id === callerId) return true;
      const gm = this.group_members.find((m) => m.id === row.group_member_id);
      if (!gm) return false;
      return (
        gm.linked_profile_id === callerId ||
        this.isGroupMember(String(gm.group_id), callerId)
      );
    }
    return row.user_id === callerId;
  }

  insertRow(
    table: string,
    payload: Record<string, unknown>,
    callerId: string,
  ): { data: HarnessRow | null; error: { message: string; code: string } | null } {
    const id = (payload.id as string) || this.genId(table);
    const ownerId = table === "profiles" ? id : String(payload.user_id ?? "");

    // 1. RLS WITH CHECK: Caller can only insert rows for their own JWT `sub`
    if (ownerId !== callerId) {
      return {
        data: null,
        error: {
          message: `new row violates row-level security policy for table "${table}"`,
          code: "42501",
        },
      };
    }

    // 2. Table-specific CHECK constraints & foreign-key ownership checks
    if (table === "settlements") {
      const mode = payload.settlement_mode;
      const accountId = payload.account_id ?? null;
      const validFromBalance = mode === "from_balance" && accountId !== null;
      const validSeparate = mode === "separate" && accountId === null;
      if (!validFromBalance && !validSeparate) {
        return {
          data: null,
          error: {
            message:
              'new row for relation "settlements" violates check constraint "settlement_mode_account_check"',
            code: "23514",
          },
        };
      }

      const split = this.transaction_splits.find(
        (s) => s.id === payload.transaction_split_id && s.user_id === callerId,
      );
      if (!split) {
        return {
          data: null,
          error: {
            message: `Split ${payload.transaction_split_id} does not belong to user ${callerId}`,
            code: "42501",
          },
        };
      }
      if (accountId !== null) {
        const acc = this.accounts.find(
          (a) => a.id === accountId && a.user_id === callerId,
        );
        if (!acc) {
          return {
            data: null,
            error: {
              message: `Settlement account ${accountId} does not belong to user ${callerId}`,
              code: "42501",
            },
          };
        }
      }
    }

    if (table === "balance_entries") {
      const reason = String(payload.reason ?? "");
      if (!VALID_BALANCE_REASONS.has(reason)) {
        return {
          data: null,
          error: {
            message:
              'new row for relation "balance_entries" violates check constraint "balance_entries_reason_check"',
            code: "23514",
          },
        };
      }
      const acc = this.accounts.find(
        (a) => a.id === payload.account_id && a.user_id === callerId,
      );
      if (!acc) {
        return {
          data: null,
          error: {
            message:
              'new row violates row-level security policy for table "balance_entries"',
            code: "42501",
          },
        };
      }
    }

    if (table === "group_members") {
      const group = this.groups.find(
        (g) => g.id === payload.group_id && g.user_id === callerId,
      );
      if (!group) {
        return {
          data: null,
          error: {
            message:
              'new row violates row-level security policy for table "group_members"',
            code: "42501",
          },
        };
      }
    }

    if (table === "transactions") {
      const acc = this.accounts.find(
        (a) => a.id === payload.account_id && a.user_id === callerId,
      );
      if (!acc) {
        return {
          data: null,
          error: {
            message: `Source account ${payload.account_id} does not belong to user ${callerId}`,
            code: "42501",
          },
        };
      }
    }

    const row: HarnessRow = {
      ...payload,
      id,
      created_at: new Date().toISOString(),
    };

    (this as unknown as Record<string, HarnessRow[]>)[table].push(row);

    // 3. Fire AFTER INSERT database triggers
    if (table === "transactions" && row.status === "completed") {
      const amount = Math.abs(Number(row.amount));
      const delta = row.type === "income" ? amount : -amount;
      this.balance_entries.push({
        id: this.genId("be"),
        user_id: callerId,
        account_id: row.account_id,
        transaction_id: row.id,
        delta,
        reason: "transaction",
        created_at: new Date().toISOString(),
      });

      if (row.type === "transfer" && row.transfer_account_id) {
        this.balance_entries.push({
          id: this.genId("be"),
          user_id: callerId,
          account_id: row.transfer_account_id,
          transaction_id: row.id,
          delta: amount,
          reason: "transaction",
          created_at: new Date().toISOString(),
        });
      }
    }

    if (table === "settlements") {
      const split = this.transaction_splits.find(
        (s) => s.id === row.transaction_split_id,
      )!;
      const amount = Math.abs(Number(row.amount));

      if (row.settlement_mode === "from_balance" && row.account_id) {
        const delta = split.direction === "owed_to_me" ? amount : -amount;
        this.balance_entries.push({
          id: this.genId("be"),
          user_id: callerId,
          account_id: row.account_id,
          settlement_id: row.id,
          delta,
          reason: "settlement",
          created_at: new Date().toISOString(),
        });
      }

      const totalSettled = this.settlements
        .filter((s) => s.transaction_split_id === split.id)
        .reduce((sum, s) => sum + Number(s.amount), 0);

      split.status =
        totalSettled >= Number(split.share_amount) ? "settled" : "partial";
    }

    return { data: row, error: null };
  }

  getAccountBalance(accountId: string, callerId: string): number {
    return this.balance_entries
      .filter((be) => be.account_id === accountId && be.user_id === callerId)
      .reduce((sum, be) => sum + Number(be.delta), 0);
  }
}

function createRlsClient(
  db: RlsDatabaseState,
  callerJwtSub: string,
): SupabaseClient<Database> {
  const buildFilterChain = (
    table: string,
    op: "select" | "update" | "delete",
    updatePayload?: Record<string, unknown>,
  ) => {
    const filters: Array<(row: HarnessRow) => boolean> = [];

    const execute = () => {
      // Enforce append-only immutability on `balance_entries`
      if (table === "balance_entries" && (op === "update" || op === "delete")) {
        return {
          data: null,
          error: {
            message: `balance_entries is an append-only ledger: ${op.toUpperCase()} is prohibited`,
            code: "42501",
          },
        };
      }

      const rows = (db as unknown as Record<string, HarnessRow[]>)[table] ?? [];
      const matching = rows.filter(
        (row) =>
          db.canReadRow(table, row, callerJwtSub) &&
          filters.every((fn) => fn(row)),
      );

      if (op === "select") {
        if (table === "accounts_with_balances") {
          const accRows = db.accounts
            .filter(
              (a) =>
                db.canReadRow("accounts", a, callerJwtSub) &&
                filters.every((fn) => fn(a)),
            )
            .map((a) => ({
              ...a,
              balance: db.getAccountBalance(a.id, callerJwtSub),
            }));
          return { data: accRows, error: null };
        }
        return { data: matching, error: null };
      }

      if (op === "update") {
        // Only owner (`user_id === callerJwtSub` or `id === callerJwtSub`) can update
        const writable = matching.filter((row) =>
          table === "profiles"
            ? row.id === callerJwtSub
            : row.user_id === callerJwtSub,
        );
        for (const row of writable) {
          Object.assign(row, updatePayload);
        }
        return { data: writable, error: null };
      }

      if (op === "delete") {
        const tableArr = (db as unknown as Record<string, HarnessRow[]>)[table];
        const writableIds = new Set(
          matching
            .filter((row) =>
              table === "profiles"
                ? row.id === callerJwtSub
                : row.user_id === callerJwtSub,
            )
            .map((r) => r.id),
        );
        const remaining = tableArr.filter((r) => !writableIds.has(r.id));
        (db as unknown as Record<string, HarnessRow[]>)[table] = remaining;
        return { data: matching.filter((r) => writableIds.has(r.id)), error: null };
      }

      return { data: [], error: null };
    };

    const chain: Record<string, unknown> = {
      eq(col: string, val: unknown) {
        filters.push((row) => row[col] === val);
        return chain;
      },
      neq(col: string, val: unknown) {
        filters.push((row) => row[col] !== val);
        return chain;
      },
      in(col: string, vals: unknown[]) {
        filters.push((row) => vals.includes(row[col]));
        return chain;
      },
      order() {
        return chain;
      },
      limit() {
        return chain;
      },
      select() {
        return chain;
      },
      single() {
        const res = execute();
        if (res.error) return Promise.resolve(res);
        const first = Array.isArray(res.data) ? res.data[0] ?? null : res.data;
        if (!first) {
          return Promise.resolve({
            data: null,
            error: { message: "Row not found or access denied", code: "PGRST116" },
          });
        }
        return Promise.resolve({ data: first, error: null });
      },
      maybeSingle() {
        const res = execute();
        if (res.error) return Promise.resolve(res);
        const first = Array.isArray(res.data) ? res.data[0] ?? null : res.data;
        return Promise.resolve({ data: first, error: null });
      },
      then(resolve: (val: unknown) => void) {
        resolve(execute());
      },
    };

    return chain;
  };

  return {
    from(table: string) {
      return {
        select() {
          return buildFilterChain(table, "select");
        },
        insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
          const items = Array.isArray(payload) ? payload : [payload];
          const inserted: HarnessRow[] = [];
          let firstErr: { message: string; code: string } | null = null;

          for (const item of items) {
            const res = db.insertRow(table, item, callerJwtSub);
            if (res.error) {
              firstErr = res.error;
              break;
            }
            if (res.data) inserted.push(res.data);
          }

          const resultObj = {
            data: firstErr ? null : Array.isArray(payload) ? inserted : inserted[0],
            error: firstErr,
          };

          return {
            select() {
              return {
                single: () => Promise.resolve(resultObj),
                then(resolve: (v: unknown) => void) {
                  resolve({ data: firstErr ? null : inserted, error: firstErr });
                },
              };
            },
            then(resolve: (v: unknown) => void) {
              resolve(resultObj);
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return buildFilterChain(table, "update", payload);
        },
        delete() {
          return buildFilterChain(table, "delete");
        },
      };
    },
    rpc(fnName: string, params: Record<string, unknown>) {
      if (fnName === "reverse_transaction_atomic") {
        const txId = String(params.p_transaction_id ?? "");
        const tx = db.transactions.find(
          (t) => t.id === txId && t.user_id === callerJwtSub,
        );
        if (!tx) {
          return Promise.resolve({
            data: null,
            error: {
              message: `Transaction ${txId} not found or access denied`,
              code: "42501",
            },
          });
        }
        tx.status = "cancelled";
        const amount = Math.abs(Number(tx.amount));
        const reversalDelta = tx.type === "income" ? -amount : amount;
        db.balance_entries.push({
          id: db.genId("be"),
          user_id: callerJwtSub,
          account_id: tx.account_id,
          transaction_id: tx.id,
          delta: reversalDelta,
          reason: "reversal",
          created_at: new Date().toISOString(),
        });
        return Promise.resolve({ data: tx, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as SupabaseClient<Database>;
}

// =============================================================================
// TEST SUITE
// =============================================================================
describe("Database & Security Tests (RLS Isolation, Constraints, Triggers & Group Visibility)", () => {
  it("1. Cross-User Isolation: User A can never read or write User B's profiles, accounts, transactions, groups, or settlements", async () => {
    const db = new RlsDatabaseState();
    const userA = "user_a_clerk_id";
    const userB = "user_b_clerk_id";

    const clientA = createRlsClient(db, userA);
    const clientB = createRlsClient(db, userB);

    // Seed User B's data using User B's authenticated client
    await clientB.from("profiles").insert({
      id: userB,
      email: "b@saldo.app",
      name: "User B",
      currency: "PKR",
    });
    const { data: accB } = await clientB
      .from("accounts")
      .insert({
        user_id: userB,
        name: "B Vault",
        type: "bank",
        currency: "PKR",
      })
      .select()
      .single();

    const { data: txB } = await clientB
      .from("transactions")
      .insert({
        user_id: userB,
        account_id: accB!.id,
        type: "expense",
        amount: 950,
        description: "B Private Expense",
        status: "completed",
      })
      .select()
      .single();

    const { data: groupB } = await clientB
      .from("groups")
      .insert({
        user_id: userB,
        name: "B Secret Group",
      })
      .select()
      .single();

    const { data: memberB } = await clientB
      .from("group_members")
      .insert({
        group_id: groupB!.id,
        user_id: userB,
        name: "B Friend",
      })
      .select()
      .single();

    const { data: splitB } = await clientB
      .from("transaction_splits")
      .insert({
        user_id: userB,
        transaction_id: txB!.id,
        group_member_id: memberB!.id,
        share_amount: 475,
        direction: "owed_to_me",
        status: "open",
      })
      .select()
      .single();

    await clientB.from("settlements").insert({
      user_id: userB,
      transaction_split_id: splitB!.id,
      settlement_mode: "from_balance",
      account_id: accB!.id,
      amount: 475,
    });

    // Now query directly with User A's token (`clientA`)
    const { data: readProfiles } = await clientA
      .from("profiles")
      .select("*")
      .eq("id", userB);
    expect(readProfiles).toHaveLength(0);

    const { data: readAccounts } = await clientA
      .from("accounts")
      .select("*")
      .eq("user_id", userB);
    expect(readAccounts).toHaveLength(0);

    const { data: readTxs } = await clientA
      .from("transactions")
      .select("*")
      .eq("user_id", userB);
    expect(readTxs).toHaveLength(0);

    const { data: readGroups } = await clientA
      .from("groups")
      .select("*")
      .eq("id", groupB!.id);
    expect(readGroups).toHaveLength(0);

    const { data: readSettlements } = await clientA
      .from("settlements")
      .select("*")
      .eq("user_id", userB);
    expect(readSettlements).toHaveLength(0);

    // Attempt direct writes against User B's records using User A's token
    const { error: spoofAccountErr } = await clientA.from("accounts").insert({
      user_id: userB,
      name: "Spoofed by A",
      type: "cash",
      currency: "PKR",
    });
    expect(spoofAccountErr).not.toBeNull();
    expect(spoofAccountErr?.code).toBe("42501");

    const { error: spoofTxErr } = await clientA.from("transactions").insert({
      user_id: userA,
      account_id: accB!.id, // Trying to debit User B's account!
      type: "expense",
      amount: 5000,
      status: "completed",
    });
    expect(spoofTxErr).not.toBeNull();
    expect(spoofTxErr?.code).toBe("42501");

    // Attempt to update or delete User B's account via service layer using User A's token
    await expect(
      updateAccount(clientA, userA, { id: accB!.id, name: "Hacked Name" }),
    ).rejects.toBeDefined();
    expect(db.accounts.find((a) => a.id === accB!.id)?.name).toBe("B Vault");

    await expect(
      deleteAccount(clientA, userA, accB!.id),
    ).rejects.toBeDefined();
    expect(db.accounts.find((a) => a.id === accB!.id)).toBeDefined();
  });

  it("2. Constraint Violations & Ledger Immutability: rejects invalid settlements, invalid balance_entries reasons, and ledger UPDATE/DELETE", async () => {
    const db = new RlsDatabaseState();
    const userA = "user_a_clerk_id";
    const clientA = createRlsClient(db, userA);

    const { data: accA } = await clientA
      .from("accounts")
      .insert({
        user_id: userA,
        name: "A Main Bank",
        type: "bank",
        currency: "PKR",
      })
      .select()
      .single();

    const { data: txA } = await clientA
      .from("transactions")
      .insert({
        user_id: userA,
        account_id: accA!.id,
        type: "expense",
        amount: 1000,
        status: "completed",
      })
      .select()
      .single();

    const { data: groupA } = await clientA
      .from("groups")
      .insert({ user_id: userA, name: "Lunch" })
      .select()
      .single();

    const { data: memberA } = await clientA
      .from("group_members")
      .insert({ group_id: groupA!.id, user_id: userA, name: "Ali" })
      .select()
      .single();

    const { data: splitA } = await clientA
      .from("transaction_splits")
      .insert({
        user_id: userA,
        transaction_id: txA!.id,
        group_member_id: memberA!.id,
        share_amount: 500,
        direction: "owed_to_me",
        status: "open",
      })
      .select()
      .single();

    // (a) Settlement with `from_balance` and NULL `account_id` -> REJECTED
    const { error: missingAccErr } = await clientA.from("settlements").insert({
      user_id: userA,
      transaction_split_id: splitA!.id,
      settlement_mode: "from_balance",
      account_id: null,
      amount: 500,
    });
    expect(missingAccErr).not.toBeNull();
    expect(missingAccErr?.code).toBe("23514");
    expect(missingAccErr?.message).toContain("settlement_mode_account_check");

    // (b) Settlement with `separate` and non-NULL `account_id` -> REJECTED
    const { error: separateWithAccErr } = await clientA
      .from("settlements")
      .insert({
        user_id: userA,
        transaction_split_id: splitA!.id,
        settlement_mode: "separate",
        account_id: accA!.id,
        amount: 500,
      });
    expect(separateWithAccErr).not.toBeNull();
    expect(separateWithAccErr?.code).toBe("23514");

    // (c) Invalid `reason` in `balance_entries` -> REJECTED
    const { error: badReasonErr } = await clientA
      .from("balance_entries")
      .insert({
        user_id: userA,
        account_id: accA!.id,
        delta: 1000,
        reason: "fake_reason" as never,
      });
    expect(badReasonErr).not.toBeNull();
    expect(badReasonErr?.code).toBe("23514");
    expect(badReasonErr?.message).toContain("balance_entries_reason_check");

    // (d) Direct UPDATE on `balance_entries` -> REJECTED
    const { error: updateLedgerErr } = await clientA
      .from("balance_entries")
      .update({ delta: 999999 })
      .eq("account_id", accA!.id);
    expect(updateLedgerErr).not.toBeNull();
    expect(updateLedgerErr?.code).toBe("42501");

    // (e) Direct DELETE on `balance_entries` -> REJECTED
    const { error: deleteLedgerErr } = await clientA
      .from("balance_entries")
      .delete()
      .eq("account_id", accA!.id);
    expect(deleteLedgerErr).not.toBeNull();
    expect(deleteLedgerErr?.code).toBe("42501");
  });

  it("3. Triggers & Reversal Balance Verification: writes ledger entries on transaction and settlement inserts and restores exact balance on reversal", async () => {
    const db = new RlsDatabaseState();
    const userA = "user_a_clerk_id";
    const clientA = createRlsClient(db, userA);

    const { data: bankAcc } = await clientA
      .from("accounts")
      .insert({
        user_id: userA,
        name: "Meezan Bank",
        type: "bank",
        currency: "PKR",
        is_default: true,
      })
      .select()
      .single();

    // Opening top_up: +10,000
    await clientA.from("balance_entries").insert({
      user_id: userA,
      account_id: bankAcc!.id,
      delta: 10000,
      reason: "top_up",
    });

    // 1. Insert Expense (-2,500) -> balance becomes 7,500
    const expenseTx = await createTransaction(clientA, {
      user_id: userA,
      account_id: bankAcc!.id,
      type: "expense",
      amount: 2500,
      description: "Groceries",
      status: "completed",
      input_method: "manual",
    });
    expect(expenseTx).not.toBeNull();
    expect(db.getAccountBalance(bankAcc!.id, userA)).toBe(7500);

    // 2. Insert Income (+1,500) -> balance becomes 9,000
    await createTransaction(clientA, {
      user_id: userA,
      account_id: bankAcc!.id,
      type: "income",
      amount: 1500,
      description: "Cashback",
      status: "completed",
      input_method: "manual",
    });
    expect(db.getAccountBalance(bankAcc!.id, userA)).toBe(9000);

    // 3. Insert Split & Settlement (`from_balance`, owed_to_me: +500) -> balance becomes 9,500
    const { data: group } = await clientA
      .from("groups")
      .insert({ user_id: userA, name: "Flatmates" })
      .select()
      .single();
    const { data: member } = await clientA
      .from("group_members")
      .insert({ group_id: group!.id, user_id: userA, name: "Hamza" })
      .select()
      .single();
    const { data: split } = await clientA
      .from("transaction_splits")
      .insert({
        user_id: userA,
        transaction_id: expenseTx.id,
        group_member_id: member!.id,
        share_amount: 500,
        direction: "owed_to_me",
        status: "open",
      })
      .select()
      .single();

    await settleSplit(
      clientA,
      userA,
      split!.id,
      500,
      bankAcc!.id,
      "account_impact",
    );
    expect(db.getAccountBalance(bankAcc!.id, userA)).toBe(9500);
    expect(
      db.transaction_splits.find((s) => s.id === split!.id)?.status,
    ).toBe("settled");

    // 4. Reverse the 2,500 Expense -> posts +2,500 offsetting entry -> balance becomes 12,000
    const reversalRow = await reverseTransaction(
      clientA,
      userA,
      { ...expenseTx, category: null },
      "Duplicate entry",
    );
    expect(reversalRow).toBeDefined();
    expect(db.getAccountBalance(bankAcc!.id, userA)).toBe(12000);

    const accountsWithBal = await getAccountsWithBalances(clientA, userA);
    expect(accountsWithBal[0]?.balance).toBe(12000);
  });

  it("4. Group Member Visibility: group creator and linked group members can view group data while non-members cannot", async () => {
    const db = new RlsDatabaseState();
    const userA = "user_a_owner";
    const userB = "user_b_linked_member";
    const userC = "user_c_outsider";

    const clientA = createRlsClient(db, userA);
    const clientB = createRlsClient(db, userB);
    const clientC = createRlsClient(db, userC);

    // User A creates a group and adds User B as a linked member (`linked_profile_id = userB`)
    const group = await createGroup(clientA, userA, "Hunza Roadtrip", ["User B"]);
    expect(group).not.toBeNull();

    // Link User B's profile ID on the group_member record
    const memberRow = db.group_members.find(
      (gm) => gm.group_id === group!.id && gm.name === "User B",
    );
    expect(memberRow).toBeDefined();
    memberRow!.linked_profile_id = userB;

    // Creator (User A) can read the group
    const groupsForA = await getGroups(clientA, userA);
    expect(groupsForA).toHaveLength(1);
    expect(groupsForA[0]?.name).toBe("Hunza Roadtrip");

    // Linked Group Member (User B) can read the group & its members via direct Supabase query
    const { data: groupsForB } = await clientB
      .from("groups")
      .select("*")
      .eq("id", group!.id);
    expect(groupsForB).toHaveLength(1);
    expect(groupsForB![0]?.name).toBe("Hunza Roadtrip");

    const { data: membersForB } = await clientB
      .from("group_members")
      .select("*")
      .eq("group_id", group!.id);
    expect(membersForB?.length).toBeGreaterThanOrEqual(1);

    // Non-Member Outsider (User C) sees 0 groups and 0 group_members
    const { data: groupsForC } = await clientC
      .from("groups")
      .select("*")
      .eq("id", group!.id);
    expect(groupsForC).toHaveLength(0);

    const { data: membersForC } = await clientC
      .from("group_members")
      .select("*")
      .eq("group_id", group!.id);
    expect(membersForC).toHaveLength(0);

    // Non-Member Outsider (User C) cannot insert a member into User A's group
    const { error: outsiderInsertErr } = await clientC
      .from("group_members")
      .insert({
        group_id: group!.id,
        user_id: userC,
        name: "Intruder",
      });
    expect(outsiderInsertErr).not.toBeNull();
  });

  it("5. Edge Function Security & JWT Verification: ai-chat Edge Function rejects unauthenticated callers and enforces CORS", async () => {
    const { handleRequest } = await import(
      "../../supabase/functions/ai-chat/index"
    );

    // Unauthenticated request (missing Bearer token) must be rejected with 401 before touching Gemini
    const unauthReq = new Request("https://example.supabase.co/functions/v1/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      }),
    });
    const unauthRes = await handleRequest(unauthReq);
    expect(unauthRes.status).toBe(401);

    // OPTIONS preflight request must return 200 with CORS headers
    const optionsReq = new Request("https://example.supabase.co/functions/v1/ai-chat", {
      method: "OPTIONS",
    });
    const optionsRes = await handleRequest(optionsReq);
    expect(optionsRes.status).toBe(200);
    expect(optionsRes.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
