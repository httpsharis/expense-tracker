-- =============================================================================
-- Migration: 20261011000000_fix_rls_and_ledger_triggers.sql
-- Purpose:
--   1. Revoke over-permissive `anon` privileges granted in 20260927 migrations.
--   2. Drop every permissive RLS policy created by 20260927* migrations by exact
--      name and replace with strict SELECT/INSERT/UPDATE/DELETE policies scoped
--      to `(auth.jwt()->>'sub')` with explicit `WITH CHECK` clauses.
--   3. Change `transactions.account_id` FK from ON DELETE RESTRICT to CASCADE
--      so account and profile deletion cascade cleanly, and add `tags text[]`.
--   4. Restore `handle_transaction_balance_entry()` to write `(user_id,
--      account_id, transaction_id, delta, reason)`, credit `transfer_account_id`
--      on transfers, and verify account ownership.
-- =============================================================================

-- 1. REVOKE ANON PRIVILEGES & LOCK DOWN DEFAULT PRIVILEGES
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE UPDATE, DELETE ON TABLE public.balance_entries FROM authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 2. SCHEMA FIXES: CASCADE ACCOUNT DELETION, TAGS COLUMN, & REASON CHECK
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.balance_entries
  DROP CONSTRAINT IF EXISTS balance_entries_reason_check;

ALTER TABLE public.balance_entries
  ADD CONSTRAINT balance_entries_reason_check
  CHECK (reason IN ('transaction', 'settlement', 'top_up', 'adjustment', 'reversal'));

ALTER TABLE public.balance_entries
  DROP CONSTRAINT IF EXISTS balance_entries_transaction_id_fkey;

ALTER TABLE public.balance_entries
  ADD CONSTRAINT balance_entries_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE public.balance_entries
  DROP CONSTRAINT IF EXISTS balance_entries_settlement_id_fkey;

ALTER TABLE public.balance_entries
  ADD CONSTRAINT balance_entries_settlement_id_fkey
  FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE SET NULL;

-- 3. ENABLE RLS & DROP ALL LEGACY / PERMISSIVE POLICIES BY EXACT NAME
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Drop policies on profiles
DROP POLICY IF EXISTS "own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Drop policies on accounts
DROP POLICY IF EXISTS "own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can manage own accounts" ON public.accounts;
DROP POLICY IF EXISTS "accounts_select_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update_policy" ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete_policy" ON public.accounts;

-- Drop policies on categories
DROP POLICY IF EXISTS "own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public insert categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to insert categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public update categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to update categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;

-- Drop policies on budgets
DROP POLICY IF EXISTS "own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
DROP POLICY IF EXISTS "budgets_all_policy" ON public.budgets;
DROP POLICY IF EXISTS "Allow users to manage own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Allow users to manage budgets" ON public.budgets;
DROP POLICY IF EXISTS "budgets_allow_all" ON public.budgets;
DROP POLICY IF EXISTS "budgets_user_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_select_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete_policy" ON public.budgets;

-- Drop policies on subscriptions
DROP POLICY IF EXISTS "own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete_policy" ON public.subscriptions;

-- Drop policies on transactions
DROP POLICY IF EXISTS "own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

-- Drop policies on balance_entries
DROP POLICY IF EXISTS "own balance entries" ON public.balance_entries;
DROP POLICY IF EXISTS "insert own balance entries" ON public.balance_entries;
DROP POLICY IF EXISTS "Users can manage own balance entries" ON public.balance_entries;
DROP POLICY IF EXISTS "balance_entries_select_policy" ON public.balance_entries;
DROP POLICY IF EXISTS "balance_entries_insert_policy" ON public.balance_entries;

-- Drop policies on groups, group_members, transaction_splits, settlements
DROP POLICY IF EXISTS "own groups" ON public.groups;
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;

DROP POLICY IF EXISTS "own group members" ON public.group_members;
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update_policy" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_policy" ON public.group_members;

DROP POLICY IF EXISTS "own splits" ON public.transaction_splits;
DROP POLICY IF EXISTS "transaction_splits_select_policy" ON public.transaction_splits;
DROP POLICY IF EXISTS "transaction_splits_insert_policy" ON public.transaction_splits;
DROP POLICY IF EXISTS "transaction_splits_update_policy" ON public.transaction_splits;
DROP POLICY IF EXISTS "transaction_splits_delete_policy" ON public.transaction_splits;

DROP POLICY IF EXISTS "own settlements" ON public.settlements;
DROP POLICY IF EXISTS "settlements_select_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_insert_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_update_policy" ON public.settlements;
DROP POLICY IF EXISTS "settlements_delete_policy" ON public.settlements;

-- 4. CREATE STRICT CLERK JWT (`auth.jwt()->>'sub'`) RLS POLICIES

-- profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = id);
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = id);
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = id) WITH CHECK ((auth.jwt() ->> 'sub') = id);
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = id);

-- accounts
CREATE POLICY "accounts_select_policy" ON public.accounts
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "accounts_insert_policy" ON public.accounts
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "accounts_update_policy" ON public.accounts
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "accounts_delete_policy" ON public.accounts
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- categories
CREATE POLICY "categories_select_policy" ON public.categories
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "categories_insert_policy" ON public.categories
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "categories_update_policy" ON public.categories
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "categories_delete_policy" ON public.categories
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- budgets
CREATE POLICY "budgets_select_policy" ON public.budgets
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "budgets_insert_policy" ON public.budgets
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "budgets_update_policy" ON public.budgets
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "budgets_delete_policy" ON public.budgets
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- subscriptions
CREATE POLICY "subscriptions_select_policy" ON public.subscriptions
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "subscriptions_insert_policy" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "subscriptions_update_policy" ON public.subscriptions
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "subscriptions_delete_policy" ON public.subscriptions
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- transactions
CREATE POLICY "transactions_select_policy" ON public.transactions
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "transactions_insert_policy" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "transactions_update_policy" ON public.transactions
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "transactions_delete_policy" ON public.transactions
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- balance_entries (append-only: SELECT and manual account top_up/adjustment INSERT only;
-- transaction and settlement rows are inserted by SECURITY DEFINER triggers)
CREATE POLICY "balance_entries_select_policy" ON public.balance_entries
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "balance_entries_insert_policy" ON public.balance_entries
  FOR INSERT TO authenticated WITH CHECK (
    (auth.jwt() ->> 'sub') = user_id
    AND reason IN ('top_up', 'adjustment')
    AND transaction_id IS NULL
    AND settlement_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = balance_entries.account_id
        AND a.user_id = (auth.jwt() ->> 'sub')
    )
  );

-- groups
CREATE POLICY "groups_select_policy" ON public.groups
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "groups_insert_policy" ON public.groups
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "groups_update_policy" ON public.groups
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "groups_delete_policy" ON public.groups
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- group_members
CREATE POLICY "group_members_select_policy" ON public.group_members
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "group_members_insert_policy" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "group_members_update_policy" ON public.group_members
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "group_members_delete_policy" ON public.group_members
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- transaction_splits
CREATE POLICY "transaction_splits_select_policy" ON public.transaction_splits
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "transaction_splits_insert_policy" ON public.transaction_splits
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "transaction_splits_update_policy" ON public.transaction_splits
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "transaction_splits_delete_policy" ON public.transaction_splits
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- settlements
CREATE POLICY "settlements_select_policy" ON public.settlements
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "settlements_insert_policy" ON public.settlements
  FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "settlements_update_policy" ON public.settlements
  FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "settlements_delete_policy" ON public.settlements
  FOR DELETE TO authenticated USING ((auth.jwt() ->> 'sub') = user_id);

-- 5. RESTORE & HARDEN LEDGER TRIGGERS (ATOMIC INSERT & UPDATE)
CREATE OR REPLACE FUNCTION public.handle_transaction_balance_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_primary_delta DECIMAL(12, 2) := 0;
  v_old_transfer_delta DECIMAL(12, 2) := 0;
  v_new_primary_delta DECIMAL(12, 2) := 0;
  v_new_transfer_delta DECIMAL(12, 2) := 0;
BEGIN
  -- Verify source account belongs to the transaction owner
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = NEW.account_id AND a.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Source account % does not belong to user %', NEW.account_id, NEW.user_id;
  END IF;

  -- Verify transfer destination account belongs to the transaction owner
  IF NEW.type = 'transfer' AND NEW.transfer_account_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = NEW.transfer_account_id AND a.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Destination account % does not belong to user %', NEW.transfer_account_id, NEW.user_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status <> 'completed' AND NEW.status = 'completed') THEN
    IF NEW.status = 'completed' THEN
      IF NEW.type = 'income' THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.account_id, NEW.id, ABS(NEW.amount), 'transaction');
      ELSIF NEW.type = 'expense' THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.account_id, NEW.id, -ABS(NEW.amount), 'transaction');
      ELSIF NEW.type = 'transfer' THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.account_id, NEW.id, -ABS(NEW.amount), 'transaction');

        IF NEW.transfer_account_id IS NOT NULL THEN
          INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
          VALUES (NEW.user_id, NEW.transfer_account_id, NEW.id, ABS(NEW.amount), 'transaction');
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Atomic ledger adjustment when a completed transaction is edited
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status = 'completed' THEN
    v_old_primary_delta := CASE
      WHEN OLD.type = 'income' THEN ABS(OLD.amount)
      ELSE -ABS(OLD.amount)
    END;
    v_old_transfer_delta := CASE
      WHEN OLD.type = 'transfer' AND OLD.transfer_account_id IS NOT NULL THEN ABS(OLD.amount)
      ELSE 0
    END;

    v_new_primary_delta := CASE
      WHEN NEW.type = 'income' THEN ABS(NEW.amount)
      ELSE -ABS(NEW.amount)
    END;
    v_new_transfer_delta := CASE
      WHEN NEW.type = 'transfer' AND NEW.transfer_account_id IS NOT NULL THEN ABS(NEW.amount)
      ELSE 0
    END;

    IF OLD.account_id = NEW.account_id AND OLD.transfer_account_id IS NOT DISTINCT FROM NEW.transfer_account_id THEN
      IF (v_new_primary_delta - v_old_primary_delta) <> 0 THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.account_id, NEW.id, v_new_primary_delta - v_old_primary_delta, 'adjustment');
      END IF;

      IF NEW.transfer_account_id IS NOT NULL AND (v_new_transfer_delta - v_old_transfer_delta) <> 0 THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.transfer_account_id, NEW.id, v_new_transfer_delta - v_old_transfer_delta, 'adjustment');
      END IF;
    ELSE
      IF v_old_primary_delta <> 0 THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, OLD.account_id, NEW.id, -v_old_primary_delta, 'adjustment');
      END IF;
      IF OLD.transfer_account_id IS NOT NULL AND v_old_transfer_delta <> 0 THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, OLD.transfer_account_id, NEW.id, -v_old_transfer_delta, 'adjustment');
      END IF;

      IF v_new_primary_delta <> 0 THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.account_id, NEW.id, v_new_primary_delta, 'adjustment');
      END IF;
      IF NEW.transfer_account_id IS NOT NULL AND v_new_transfer_delta <> 0 THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.transfer_account_id, NEW.id, v_new_transfer_delta, 'adjustment');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transaction_balance_entry ON public.transactions;
CREATE TRIGGER trg_transaction_balance_entry
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_transaction_balance_entry();

CREATE OR REPLACE FUNCTION public.handle_settlement_balance_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_split_direction TEXT;
  v_share_amount DECIMAL(12, 2);
  v_total_settled DECIMAL(12, 2);
BEGIN
  SELECT direction, share_amount
  INTO v_split_direction, v_share_amount
  FROM public.transaction_splits
  WHERE id = NEW.transaction_split_id AND user_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split % does not belong to user %', NEW.transaction_split_id, NEW.user_id;
  END IF;

  IF NEW.settlement_mode = 'from_balance' AND NEW.account_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = NEW.account_id AND a.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Settlement account % does not belong to user %', NEW.account_id, NEW.user_id;
    END IF;

    IF v_split_direction = 'owed_to_me' THEN
      INSERT INTO public.balance_entries (user_id, account_id, settlement_id, delta, reason)
      VALUES (NEW.user_id, NEW.account_id, NEW.id, ABS(NEW.amount), 'settlement');
    ELSIF v_split_direction = 'i_owe' THEN
      INSERT INTO public.balance_entries (user_id, account_id, settlement_id, delta, reason)
      VALUES (NEW.user_id, NEW.account_id, NEW.id, -ABS(NEW.amount), 'settlement');
    END IF;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_settled
  FROM public.settlements
  WHERE transaction_split_id = NEW.transaction_split_id;

  IF v_total_settled >= v_share_amount THEN
    UPDATE public.transaction_splits
    SET status = 'settled'
    WHERE id = NEW.transaction_split_id;
  ELSE
    UPDATE public.transaction_splits
    SET status = 'partial'
    WHERE id = NEW.transaction_split_id;
  END IF;

  RETURN NEW;
END;
$$;
