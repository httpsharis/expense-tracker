import {
    applySettlement,
    calculateSettlementState,
    computeSplitShares,
    fromMinorUnits,
    toMinorUnits,
    type SplitMode,
} from "@shared/lib/money";
import { generateUUID } from "@shared/lib/uuid";
import type { Database } from "@shared/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createTransaction, reverseTransaction } from "./transactions";

export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type TransactionSplit = Database["public"]["Tables"]["transaction_splits"]["Row"];
export type Settlement = Database["public"]["Tables"]["settlements"]["Row"];

export interface GroupWithMembers extends Group {
  members: GroupMember[];
  total_expenses?: number;
  unsettled_count?: number;
}

export interface SettlementHistoryItem {
  id: string;
  transaction_split_id: string;
  user_id: string;
  amount: number;
  settlement_mode: "from_balance" | "separate";
  account_id: string | null;
  account_name: string | null;
  account_type: string | null;
  created_at: string;
  friend_name: string;
  group_name: string;
  direction: "owed_to_me" | "i_owe";
  type: "received" | "paid"; // 'received' = money I got (owed_to_me); 'paid' = money I settled (i_owe)
  transaction_description: string | null;
  transaction_date?: string;
  split_total: number;
  is_full_settlement?: boolean;
}

export interface SettlementHistorySummary {
  totalReceived: number; // "this much money I got"
  totalPaid: number;     // "and this much i settled"
  netSettled: number;    // totalReceived - totalPaid
  receivedCount: number;
  paidCount: number;
  totalCount: number;
}

export interface SplitDetailItem extends TransactionSplit {
  member_name: string;
  group_name: string;
  group_id?: string;
  transaction_description?: string | null;
  transaction_date?: string;
  paid_amount?: number;
  remaining_amount?: number;
  kind?: "split" | "loan";
  due_date?: string | null;
  settlements?: SettlementHistoryItem[];
}

export type SplitWithDetails = SplitDetailItem;

export interface SplitsFinancialSummary {
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
  openCount: number;
}

export type SplitsSummary = SplitsFinancialSummary;

export interface PersonDebtSummary {
  person_name: string;
  owed_to_me: number;
  i_owe: number;
  net_balance: number;
  open_count: number;
  has_overdue: boolean;
  items: SplitDetailItem[];
  settlements: SettlementHistoryItem[];
  total_received: number;
  total_settled: number;
}

export interface DirectLoanInput {
  person_name: string;
  direction: "owed_to_me" | "i_owe";
  amount: number;
  account_id: string;
  description?: string;
  due_date?: string;
}

export interface CreateSplitsOptions {
  payerName?: string;
  splitMode?: SplitMode;
  customAmounts?: Record<string, number>;
}

async function resolveDirectFriendsGroup(
  supabase: SupabaseClient<Database>,
  userId: string,
  peopleNames: readonly string[],
): Promise<{ groupId: string; members: { id: string; name: string }[] }> {
  const cleanedNames = Array.from(
    new Set(
      peopleNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0 && name.toLowerCase() !== "you"),
    ),
  );

  const { data: existingGroups, error: groupsError } = await supabase
    .from("groups")
    .select("*, members:group_members(*)")
    .eq("user_id", userId)
    .ilike("name", "Direct Friends")
    .limit(1);

  if (groupsError) throw groupsError;

  let groupId: string;
  let existingMembers: GroupMember[] = [];

  if (existingGroups && existingGroups.length > 0) {
    const existingGroup = existingGroups[0] as unknown as GroupWithMembers;
    groupId = existingGroup.id;
    existingMembers = existingGroup.members ?? [];
  } else {
    const { data: createdGroup, error: createGroupError } = await supabase
      .from("groups")
      .insert({ user_id: userId, name: "Direct Friends" })
      .select()
      .single();

    if (createGroupError) throw createGroupError;
    groupId = createdGroup.id;
  }

  const resolvedMembers: { id: string; name: string }[] = [];
  for (const name of cleanedNames) {
    const found = existingMembers.find(
      (member) => member.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (found) {
      resolvedMembers.push({ id: found.id, name: found.name });
    } else {
      const { data: insertedMember, error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, user_id: userId, name })
        .select()
        .single();

      if (memberError) throw memberError;
      resolvedMembers.push({ id: insertedMember.id, name: insertedMember.name });
      existingMembers.push(insertedMember);
    }
  }

  return { groupId, members: resolvedMembers };
}

/**
 * Fetches all groups and their members for the current user.
 */
export async function getGroups(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<GroupWithMembers[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*, members:group_members(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as GroupWithMembers[];
}

/**
 * Creates a group with a list of member names.
 */
export async function createGroup(
  supabase: SupabaseClient<Database>,
  userId: string,
  name: string,
  memberNames: string[],
): Promise<GroupWithMembers> {
  const cleanMembers = memberNames.map((member) => member.trim()).filter(Boolean);

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ user_id: userId, name: name.trim() })
    .select()
    .single();

  if (groupError) throw groupError;

  let insertedMembers: GroupMember[] = [];
  if (cleanMembers.length > 0) {
    const memberRows = cleanMembers.map((memberName) => ({
      group_id: group.id,
      user_id: userId,
      name: memberName,
    }));

    const { data: membersData, error: membersError } = await supabase
      .from("group_members")
      .insert(memberRows)
      .select();

    if (membersError) throw membersError;
    insertedMembers = membersData ?? [];
  }

  return {
    ...group,
    members: insertedMembers,
  };
}

/**
 * Fetches all splits for the user with computed settlement balances and complete settlement payment history.
 */
export async function getSplitsSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{
  splits: SplitDetailItem[];
  summary: SplitsFinancialSummary;
  settlements: SettlementHistoryItem[];
  settlementSummary: SettlementHistorySummary;
}> {
  const [splitsResult, accountsResult] = await Promise.all([
    supabase
      .from("transaction_splits")
      .select(
        `
        *,
        member:group_members(id, name, group_id, group:groups(id, name)),
        transaction:transactions(id, description, amount, date),
        settlements(id, amount, settlement_mode, account_id, created_at)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, name, type")
      .eq("user_id", userId),
  ]);

  if (splitsResult.error) throw splitsResult.error;

  const accountsMap = new Map<string, { id: string; name: string; type: string }>();
  for (const acc of accountsResult.data ?? []) {
    accountsMap.set(acc.id, acc as { id: string; name: string; type: string });
  }

  const rawRows = (splitsResult.data ?? []) as unknown as Array<
    TransactionSplit & {
      member: {
        id: string;
        name: string;
        group_id: string;
        group: { id: string; name: string } | null;
      } | null;
      transaction: {
        id: string;
        description: string | null;
        amount: number;
        date: string;
      } | null;
      settlements: Array<{
        id: string;
        amount: number;
        settlement_mode: string;
        account_id: string | null;
        created_at: string;
      }> | null;
    }
  >;

  let totalOwedToMeMinor = 0;
  let totalIOweMinor = 0;
  let openCount = 0;

  const allSettlements: SettlementHistoryItem[] = [];
  let totalReceivedMinor = 0;
  let totalPaidMinor = 0;
  let receivedCount = 0;
  let paidCount = 0;

  const splits: SplitDetailItem[] = rawRows.map((row) => {
    const rawSettlements = row.settlements ?? [];
    const settlementState = calculateSettlementState(
      Number(row.share_amount),
      rawSettlements.map((settlement) => Number(settlement.amount)),
    );

    const isSettled = row.status === "settled" || settlementState.isSettled;
    const remainingMinor = isSettled ? 0 : settlementState.remainingMinor;

    if (!isSettled && remainingMinor > 0) {
      openCount += 1;
      if (row.direction === "owed_to_me") {
        totalOwedToMeMinor += remainingMinor;
      } else {
        totalIOweMinor += remainingMinor;
      }
    }

    const groupName = row.member?.group?.name || "Direct Friends";
    const isDirectLoan =
      groupName === "Direct Friends" &&
      (row.transaction?.description?.startsWith("Lent to ") ||
        row.transaction?.description?.startsWith("Borrowed from ") ||
        false);

    const friendName = row.member?.name || "Friend";
    const txDesc = row.transaction?.description ?? null;
    const txDate = row.transaction?.date ?? row.created_at;
    const splitDirection = row.direction as "owed_to_me" | "i_owe";
    const splitTotal = Number(row.share_amount);

    // Map individual settlements for this split
    const splitSettlementItems: SettlementHistoryItem[] = rawSettlements.map(
      (s) => {
        const sAmount = Number(s.amount);
        const sAmountMinor = toMinorUnits(sAmount);
        const sType: "received" | "paid" =
          splitDirection === "owed_to_me" ? "received" : "paid";

        if (sType === "received") {
          totalReceivedMinor += sAmountMinor;
          receivedCount += 1;
        } else {
          totalPaidMinor += sAmountMinor;
          paidCount += 1;
        }

        const accInfo = s.account_id ? accountsMap.get(s.account_id) : null;

        const settlementItem: SettlementHistoryItem = {
          id: s.id,
          transaction_split_id: row.id,
          user_id: userId,
          amount: sAmount,
          settlement_mode:
            s.settlement_mode === "from_balance" ? "from_balance" : "separate",
          account_id: s.account_id,
          account_name: accInfo?.name ?? null,
          account_type: accInfo?.type ?? null,
          created_at: s.created_at,
          friend_name: friendName,
          group_name: groupName,
          direction: splitDirection,
          type: sType,
          transaction_description: txDesc,
          transaction_date: txDate,
          split_total: splitTotal,
          is_full_settlement: isSettled,
        };

        allSettlements.push(settlementItem);
        return settlementItem;
      },
    );

    return {
      ...row,
      status: isSettled ? "settled" : settlementState.status,
      member_name: friendName,
      group_name: groupName,
      group_id: row.member?.group_id,
      transaction_description: txDesc,
      transaction_date: txDate,
      paid_amount: fromMinorUnits(settlementState.settledMinor),
      remaining_amount: fromMinorUnits(remainingMinor),
      kind: isDirectLoan ? "loan" : "split",
      due_date: null,
      settlements: splitSettlementItems,
    };
  });

  // Sort all settlements descending by date
  allSettlements.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    splits,
    summary: {
      totalOwedToMe: fromMinorUnits(totalOwedToMeMinor),
      totalIOwe: fromMinorUnits(totalIOweMinor),
      netBalance: fromMinorUnits(totalOwedToMeMinor - totalIOweMinor),
      openCount,
    },
    settlements: allSettlements,
    settlementSummary: {
      totalReceived: fromMinorUnits(totalReceivedMinor),
      totalPaid: fromMinorUnits(totalPaidMinor),
      netSettled: fromMinorUnits(totalReceivedMinor - totalPaidMinor),
      receivedCount,
      paidCount,
      totalCount: allSettlements.length,
    },
  };
}

/**
 * Aggregates splits by person name with settlement history using integer minor units.
 */
export function getPeopleDebtSummaries(
  splits: SplitDetailItem[],
): PersonDebtSummary[] {
  const personMap = new Map<
    string,
    {
      person_name: string;
      owedToMeMinor: number;
      iOweMinor: number;
      open_count: number;
      has_overdue: boolean;
      items: SplitDetailItem[];
      settlements: SettlementHistoryItem[];
      totalReceivedMinor: number;
      totalSettledMinor: number;
    }
  >();

  const nowMs = Date.now();

  for (const split of splits) {
    const rawName = split.member_name?.trim() || "Friend";
    const key = rawName.toLowerCase();

    if (!personMap.has(key)) {
      personMap.set(key, {
        person_name: rawName,
        owedToMeMinor: 0,
        iOweMinor: 0,
        open_count: 0,
        has_overdue: false,
        items: [],
        settlements: [],
        totalReceivedMinor: 0,
        totalSettledMinor: 0,
      });
    }

    const entry = personMap.get(key)!;
    entry.items.push(split);

    if (split.settlements) {
      for (const s of split.settlements) {
        entry.settlements.push(s);
        const sMinor = toMinorUnits(s.amount);
        if (s.type === "received") {
          entry.totalReceivedMinor += sMinor;
        } else {
          entry.totalSettledMinor += sMinor;
        }
      }
    }

    const remainingMinor = toMinorUnits(
      split.remaining_amount ?? split.share_amount,
    );
    if (split.status !== "settled" && remainingMinor > 0) {
      entry.open_count += 1;
      if (split.direction === "owed_to_me") {
        entry.owedToMeMinor += remainingMinor;
      } else {
        entry.iOweMinor += remainingMinor;
      }

      if (split.due_date && new Date(split.due_date).getTime() < nowMs) {
        entry.has_overdue = true;
      }
    }
  }

  return Array.from(personMap.values())
    .map((entry) => {
      const netMinor = entry.owedToMeMinor - entry.iOweMinor;
      entry.settlements.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return {
        person_name: entry.person_name,
        owed_to_me: fromMinorUnits(entry.owedToMeMinor),
        i_owe: fromMinorUnits(entry.iOweMinor),
        net_balance: fromMinorUnits(netMinor),
        open_count: entry.open_count,
        has_overdue: entry.has_overdue,
        items: entry.items,
        settlements: entry.settlements,
        total_received: fromMinorUnits(entry.totalReceivedMinor),
        total_settled: fromMinorUnits(entry.totalSettledMinor),
      };
    })
    .sort((first, second) => Math.abs(second.net_balance) - Math.abs(first.net_balance));
}

/**
 * Dedicated function to get settlement history and financial summary.
 */
export async function getSettlementHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{
  settlements: SettlementHistoryItem[];
  summary: SettlementHistorySummary;
}> {
  const result = await getSplitsSummary(supabase, userId);
  return {
    settlements: result.settlements,
    summary: result.settlementSummary,
  };
}

/**
 * Creates split records for a transaction across group members using minor-unit math.
 */
export async function createTransactionSplits(
  supabase: SupabaseClient<Database>,
  userId: string,
  transactionId: string,
  _groupId: string | null,
  totalAmount: number,
  members: { id: string; name: string }[],
  _description: string,
  options?: CreateSplitsOptions,
): Promise<void> {
  const otherMembers = members.filter(
    (member) => member.name.trim().toLowerCase() !== "you",
  );
  if (otherMembers.length === 0 || toMinorUnits(totalAmount) <= 0) return;

  const payerName = (options?.payerName ?? "You").trim();
  const isUserPayer = payerName.toLowerCase() === "you";
  const participantNames = [
    "You",
    ...otherMembers.map((member) => member.name.trim()),
  ];

  const shares = computeSplitShares({
    totalAmount,
    participants: participantNames,
    payerName,
    splitMode: options?.splitMode ?? "equal",
    customAmounts: options?.customAmounts,
  });

  const shareByName = new Map(
    shares.map((share) => [share.name.toLowerCase(), share]),
  );

  const splitRows: Database["public"]["Tables"]["transaction_splits"]["Insert"][] = [];

  if (isUserPayer) {
    for (const member of otherMembers) {
      const memberShare = shareByName.get(member.name.trim().toLowerCase());
      if (!memberShare || memberShare.amountMinor <= 0) continue;

      splitRows.push({
        id: generateUUID(),
        transaction_id: transactionId,
        user_id: userId,
        group_member_id: member.id,
        share_amount: memberShare.amount,
        is_payer: false,
        direction: "owed_to_me",
        status: "open",
      });
    }
  } else {
    const payerMember =
      otherMembers.find(
        (member) => member.name.trim().toLowerCase() === payerName.toLowerCase(),
      ) ?? otherMembers[0];
    const yourShare = shareByName.get("you");

    if (payerMember && yourShare && yourShare.amountMinor > 0) {
      splitRows.push({
        id: generateUUID(),
        transaction_id: transactionId,
        user_id: userId,
        group_member_id: payerMember.id,
        share_amount: yourShare.amount,
        is_payer: true,
        direction: "i_owe",
        status: "open",
      });
    }
  }

  if (splitRows.length === 0) return;

  const { error } = await supabase.from("transaction_splits").insert(splitRows);
  if (error) throw error;
}

/**
 * Creates a split directly with individual friend names without requiring a pre-made group.
 */
export async function createDirectPeopleSplit(
  supabase: SupabaseClient<Database>,
  userId: string,
  transactionId: string,
  totalAmount: number,
  peopleNames: string[],
  description: string,
  options?: CreateSplitsOptions,
): Promise<void> {
  const { groupId, members } = await resolveDirectFriendsGroup(
    supabase,
    userId,
    peopleNames,
  );
  if (members.length === 0) return;

  await createTransactionSplits(
    supabase,
    userId,
    transactionId,
    groupId,
    totalAmount,
    members,
    description,
    options,
  );
}

/**
 * Records a 1-on-1 direct loan ("I Lent" or "I Borrowed").
 */
export async function createDirectLoan(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: DirectLoanInput,
): Promise<void> {
  const cleanName = input.person_name.trim();
  const amountMinor = Math.abs(toMinorUnits(input.amount));
  if (!cleanName || amountMinor <= 0 || !input.account_id) {
    throw new Error("Person name, account, and a positive loan amount are required.");
  }

  const normalizedAmount = fromMinorUnits(amountMinor);
  const { members } = await resolveDirectFriendsGroup(supabase, userId, [
    cleanName,
  ]);
  const personMember = members[0];
  if (!personMember) {
    throw new Error("Could not resolve friend record for loan.");
  }

  const descriptionText =
    input.description?.trim() ||
    (input.direction === "owed_to_me"
      ? `Lent to ${cleanName}`
      : `Borrowed from ${cleanName}`);

  const createdTransaction = await createTransaction(supabase, {
    user_id: userId,
    account_id: input.account_id,
    amount: normalizedAmount,
    type: input.direction === "owed_to_me" ? "expense" : "income",
    description: descriptionText,
    status: "completed",
    input_method: "manual",
    date: new Date().toISOString(),
  });

  const { error: splitError } = await supabase.from("transaction_splits").insert({
    id: generateUUID(),
    transaction_id: createdTransaction.id,
    user_id: userId,
    group_member_id: personMember.id,
    share_amount: normalizedAmount,
    is_payer: input.direction === "i_owe",
    direction: input.direction,
    status: "open",
  });

  if (splitError) {
    await reverseTransaction(
      supabase,
      userId,
      { ...createdTransaction, category: null },
      "Rollback failed loan split",
    ).catch(() => undefined);
    throw splitError;
  }
}

/**
 * Settles a split (partially or fully) in minor units.
 * Notice that `trg_settlement_balance_entry` in Postgres automatically posts
 * the `balance_entries` row when `settlement_mode === 'from_balance'`.
 */
export async function settleSplit(
  supabase: SupabaseClient<Database>,
  userId: string,
  splitId: string,
  settleAmount?: number,
  accountId?: string | null,
  settlementMode: "account_impact" | "off_ledger" = "account_impact",
): Promise<void> {
  if (
    settleAmount !== undefined &&
    (!Number.isFinite(settleAmount) || toMinorUnits(settleAmount) <= 0)
  ) {
    throw new Error("Settlement amount must be a positive number.");
  }

  const { data: splitRow, error: splitError } = await supabase
    .from("transaction_splits")
    .select("*, settlements(amount)")
    .eq("id", splitId)
    .eq("user_id", userId)
    .single();

  if (splitError) throw splitError;

  const typedSplit = splitRow as unknown as TransactionSplit & {
    settlements: Array<{ amount: number }> | null;
  };

  const existingAmounts = (typedSplit.settlements ?? []).map((settlement) =>
    Number(settlement.amount),
  );
  const applied = applySettlement(
    Number(typedSplit.share_amount),
    existingAmounts,
    settleAmount,
  );

  let targetAccountId = accountId ?? null;
  if (settlementMode === "account_impact" && !targetAccountId) {
    const { data: userAccounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, is_default")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .limit(1);

    if (accountsError) throw accountsError;
    targetAccountId = userAccounts?.[0]?.id ?? null;
  }

  if (settlementMode === "account_impact" && !targetAccountId) {
    throw new Error("Please select or create an account to record this settlement.");
  }

  const dbSettlementMode =
    settlementMode === "account_impact" ? "from_balance" : "separate";

  const { error: settlementInsertError } = await supabase
    .from("settlements")
    .insert({
      id: generateUUID(),
      transaction_split_id: splitId,
      user_id: userId,
      amount: applied.appliedAmount,
      settlement_mode: dbSettlementMode,
      account_id: dbSettlementMode === "from_balance" ? targetAccountId : null,
    });

  if (settlementInsertError) throw settlementInsertError;

  const { error: splitUpdateError } = await supabase
    .from("transaction_splits")
    .update({ status: applied.status })
    .eq("id", splitId)
    .eq("user_id", userId);

  if (splitUpdateError) throw splitUpdateError;
}

/**
 * Renames a friend across all of the user's groups.
 */
export async function renamePerson(
  supabase: SupabaseClient<Database>,
  userId: string,
  oldName: string,
  newName: string,
): Promise<void> {
  const cleanOld = oldName.trim();
  const cleanNew = newName.trim();
  if (!cleanOld || !cleanNew) return;

  const { error: updateError } = await supabase
    .from("group_members")
    .update({ name: cleanNew })
    .eq("user_id", userId)
    .ilike("name", cleanOld);

  if (updateError) throw updateError;
}

/**
 * Deletes a friend and their associated splits across all of the user's groups.
 */
export async function deletePerson(
  supabase: SupabaseClient<Database>,
  userId: string,
  personName: string,
): Promise<{ success: boolean; error?: string }> {
  const cleanName = personName.trim();
  if (!cleanName) {
    return { success: false, error: "Person name is required." };
  }

  // Prevent deleting a contact who still has an unsettled balance
  const splitsSummary = await getSplitsSummary(supabase, userId);
  const people = getPeopleDebtSummaries(splitsSummary.splits);
  const target = people.find((p) => p.person_name.toLowerCase() === cleanName.toLowerCase());
  if (target && Math.abs(target.net_balance) > 0.01) {
    return {
      success: false,
      error: `Cannot delete ${target.person_name} while there is an outstanding balance. Please settle first.`,
    };
  }

  const { data: members, error: membersFetchError } = await supabase
    .from("group_members")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", cleanName);

  if (membersFetchError) throw membersFetchError;
  if (!members || members.length === 0) {
    return { success: true };
  }

  const memberIds = members.map((member) => member.id);

  // 1. Fetch splits belonging to these members to cleanly clear any referencing child settlements
  const { data: splitsToDelete } = await supabase
    .from("transaction_splits")
    .select("id")
    .eq("user_id", userId)
    .in("group_member_id", memberIds);

  if (splitsToDelete && splitsToDelete.length > 0) {
    const splitIds = splitsToDelete.map((s) => s.id);
    await supabase
      .from("settlements")
      .delete()
      .eq("user_id", userId)
      .in("transaction_split_id", splitIds);
  }

  // 2. Delete transaction splits
  const { error: splitsDeleteError } = await supabase
    .from("transaction_splits")
    .delete()
    .eq("user_id", userId)
    .in("group_member_id", memberIds);

  if (splitsDeleteError) throw splitsDeleteError;

  // 3. Delete group members
  const { error: membersDeleteError } = await supabase
    .from("group_members")
    .delete()
    .eq("user_id", userId)
    .in("id", memberIds);

  if (membersDeleteError) throw membersDeleteError;

  return { success: true };
}

