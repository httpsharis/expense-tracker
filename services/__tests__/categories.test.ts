import type { Database } from "@shared/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "bun:test";
import { deleteCategory } from "../categories";

function createMockSupabase(txCount: number, budgetCount: number) {
  let deleteCalled = false;
  const client = {
    from(table: string) {
      if (table === "transactions" || table === "budgets") {
        const count = table === "transactions" ? txCount : budgetCount;
        return {
          select() {
            return {
              eq() {
                return {
                  eq: async () => ({ count, error: null }),
                };
              },
            };
          },
        };
      }
      if (table === "categories") {
        return {
          delete() {
            return {
              eq() {
                return {
                  eq: async () => {
                    deleteCalled = true;
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient<Database>;

  return { client, wasDeleted: () => deleteCalled };
}

describe("deleteCategory", () => {
  it("blocks deleting a category referenced by transactions or budgets", async () => {
    const { client, wasDeleted } = createMockSupabase(3, 1);
    let thrownMessage = "";
    try {
      await deleteCategory(client, "user-1", "cat-1");
    } catch (err: unknown) {
      thrownMessage = err instanceof Error ? err.message : String(err);
    }

    expect(thrownMessage).toBe(
      "Cannot delete category while it is used by 3 transactions and 1 budget.",
    );
    expect(wasDeleted()).toBe(false);
  });

  it("deletes an unused category cleanly", async () => {
    const { client, wasDeleted } = createMockSupabase(0, 0);

    await deleteCategory(client, "user-1", "cat-unused");
    expect(wasDeleted()).toBe(true);
  });
});
