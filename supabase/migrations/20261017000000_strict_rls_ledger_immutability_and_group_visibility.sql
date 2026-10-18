-- =============================================================================
-- Migration: 20261017000000_strict_rls_ledger_immutability_and_group_visibility.sql
-- Purpose:
--   1. Enforce strict tenant isolation across all tables using Clerk JWT `sub`
--      (`auth.jwt() ->> 'sub'`). Remove any permissive `OR user_id IS NOT NULL`
--      fallbacks so User A can NEVER read or write User B's rows.
--   2. Enforce strict database constraints:
--      - `settlement_mode_account_check`: `from_balance` requires `account_id IS NOT NULL`;
--        `separate` requires `account_id IS NULL`.
--      - `balance_entries_reason_check`: `reason IN ('transaction', 'settlement', 'top_up', 'adjustment', 'reversal')`.
--      - Append-only ledger immutability on `balance_entries`: revoke UPDATE/DELETE
--        and attach a BEFORE UPDATE OR DELETE trigger that rejects any mutation.
--   3. Verify & harden `handle_transaction_balance_entry()`,
--      `handle_settlement_balance_entry()`, and `reverse_transaction_atomic()`
--      so transaction inserts, settlement inserts, and reversals always produce
--      the exact ledger balance.
--   4. Enable group member visibility (`is_group_member` helper) so group owners
--      AND linked group members (`group_members.linked_profile_id = auth.jwt()->>'sub'`)
--      can read group data, while non-members cannot read or write it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLE GRANTS & APPEND-ONLY LEDGER PRIVILEGE LOCKDOWN
-- -----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.accounts,
  public.categories,
  public.budgets,
  public.subscriptions,
  public.transactions,
  public.groups,
  public.group_members,
  public.transaction_splits,
  public.settlements
TO authenticated;

-- balance_entries is strictly append-only (SELECT + INSERT only; NEVER UPDATE or DELETE)
REVOKE ALL ON TABLE public.balance_entries FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.balance_entries TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. STRICT CHECK CONSTRAINTS (SETTLEMENTS & BALANCE_ENTRIES)
-- -----------------------------------------------------------------------------
ALTER TABLE public.settlements
  DROP CONSTRAINT IF EXISTS settlement_mode_account_check;

ALTER TABLE public.settlements
  ADD CONSTRAINT settlement_mode_account_check CHECK (
    (settlement_mode = 'from_balance' AND account_id IS NOT NULL)
    OR (settlement_mode = 'separate' AND account_id IS NULL)
  );

ALTER TABLE public.balance_entries
  DROP CONSTRAINT IF EXISTS balance_entries_reason_check;

ALTER TABLE public.balance_entries
  ADD CONSTRAINT balance_entries_reason_check CHECK (
    reason IN ('transaction', 'settlement', 'top_up', 'adjustment', 'reversal')
  );

-- Keep ledger history intact even if a transaction or settlement row is removed:
ALTER TABLE public.balance_entries
  DROP CONSTRAINT IF EXISTS balance_entries_transaction_id_fkey;
ALTER TABLE public.balance_entries
  ADD CONSTRAINT balance_entries_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE public.balance_entries
  DROP CONSTRAINT IF EXISTS fk_balance_entries_settlement;
ALTER TABLE public.balance_entries
  DROP CONSTRAINT IF EXISTS balance_entries_settlement_id_fkey;
ALTER TABLE public.balance_entries
  ADD CONSTRAINT balance_entries_settlement_id_fkey
  FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3. APPEND-ONLY LEDGER IMMUTABILITY TRIGGER ON `balance_entries`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_balance_entries_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'balance_entries is an append-only ledger: UPDATE is prohibited'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Allow cascade deletion ONLY when the parent account or profile is already gone
    IF EXISTS (SELECT 1 FROM public.accounts WHERE id = OLD.account_id)
       AND EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.user_id) THEN
      RAISE EXCEPTION 'balance_entries is an append-only ledger: DELETE is prohibited'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_balance_entries_mutation ON public.balance_entries;
CREATE TRIGGER trg_prevent_balance_entries_mutation
  BEFORE UPDATE OR DELETE ON public.balance_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_balance_entries_mutation();

-- -----------------------------------------------------------------------------
-- 4. GROUP MEMBERSHIP HELPER (SECURITY DEFINER, NON-RECURSIVE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'sub', ''),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.user_id = public.current_clerk_user_id()
  )
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND (
        gm.user_id = public.current_clerk_user_id()
        OR gm.linked_profile_id = public.current_clerk_user_id()
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_clerk_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. STRICT ROW-LEVEL SECURITY POLICIES (USER A vs USER B + GROUP VISIBILITY)
-- -----------------------------------------------------------------------------
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

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.budgets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.balance_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.group_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_splits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.settlements FORCE ROW LEVEL SECURITY;

-- Drop existing policies to guarantee a clean slate
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'accounts', 'categories', 'budgets', 'subscriptions',
        'transactions', 'balance_entries', 'groups', 'group_members',
        'transaction_splits', 'settlements'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 5.1 profiles (strictly own profile)
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = public.current_clerk_user_id());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = public.current_clerk_user_id());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = public.current_clerk_user_id())
  WITH CHECK (id = public.current_clerk_user_id());

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING (id = public.current_clerk_user_id());

-- 5.2 accounts (strictly own accounts)
CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT TO authenticated
  USING (user_id = public.current_clerk_user_id());

CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "accounts_delete_own" ON public.accounts
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- 5.3 categories (strictly own categories)
CREATE POLICY "categories_select_own" ON public.categories
  FOR SELECT TO authenticated
  USING (user_id = public.current_clerk_user_id());

CREATE POLICY "categories_insert_own" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "categories_update_own" ON public.categories
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "categories_delete_own" ON public.categories
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- 5.4 budgets (strictly own budgets)
CREATE POLICY "budgets_select_own" ON public.budgets
  FOR SELECT TO authenticated
  USING (user_id = public.current_clerk_user_id());

CREATE POLICY "budgets_insert_own" ON public.budgets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "budgets_update_own" ON public.budgets
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "budgets_delete_own" ON public.budgets
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- 5.5 subscriptions (strictly own subscriptions)
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = public.current_clerk_user_id());

CREATE POLICY "subscriptions_insert_own" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "subscriptions_update_own" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "subscriptions_delete_own" ON public.subscriptions
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- 5.6 transactions (strictly own transactions + account ownership check)
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT TO authenticated
  USING (user_id = public.current_clerk_user_id());

CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = transactions.account_id
        AND a.user_id = public.current_clerk_user_id()
    )
  );

CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (
    user_id = public.current_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = transactions.account_id
        AND a.user_id = public.current_clerk_user_id()
    )
  );

CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- 5.7 balance_entries (SELECT own; INSERT own top_up/adjustment/reversal only; NO UPDATE/DELETE)
CREATE POLICY "balance_entries_select_own" ON public.balance_entries
  FOR SELECT TO authenticated
  USING (user_id = public.current_clerk_user_id());

CREATE POLICY "balance_entries_insert_own" ON public.balance_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_clerk_user_id()
    AND reason IN ('top_up', 'adjustment', 'reversal')
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = balance_entries.account_id
        AND a.user_id = public.current_clerk_user_id()
    )
  );

-- 5.8 groups (group owner OR linked group member can SELECT; only owner can INSERT/UPDATE/DELETE)
CREATE POLICY "groups_select_member_or_owner" ON public.groups
  FOR SELECT TO authenticated
  USING (
    user_id = public.current_clerk_user_id()
    OR public.is_group_member(id)
  );

CREATE POLICY "groups_insert_owner" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "groups_update_owner" ON public.groups
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "groups_delete_owner" ON public.groups
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- 5.9 group_members (group owner OR linked member of that group can SELECT; only owner can write)
CREATE POLICY "group_members_select_member_or_owner" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    user_id = public.current_clerk_user_id()
    OR linked_profile_id = public.current_clerk_user_id()
    OR public.is_group_member(group_id)
  );

CREATE POLICY "group_members_insert_owner" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.user_id = public.current_clerk_user_id()
    )
  );

CREATE POLICY "group_members_update_owner" ON public.group_members
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "group_members_delete_owner" ON public.group_members
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- 5.10 transaction_splits (owner OR linked member in the split's group can SELECT; only owner can write)
CREATE POLICY "transaction_splits_select_member_or_owner" ON public.transaction_splits
  FOR SELECT TO authenticated
  USING (
    user_id = public.current_clerk_user_id()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.id = transaction_splits.group_member_id
        AND (
          gm.linked_profile_id = public.current_clerk_user_id()
          OR public.is_group_member(gm.group_id)
        )
    )
  );

CREATE POLICY "transaction_splits_insert_owner" ON public.transaction_splits
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "transaction_splits_update_owner" ON public.transaction_splits
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "transaction_splits_delete_owner" ON public.transaction_splits
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- 5.11 settlements (strictly own settlements + own split + own account when from_balance)
CREATE POLICY "settlements_select_own" ON public.settlements
  FOR SELECT TO authenticated
  USING (user_id = public.current_clerk_user_id());

CREATE POLICY "settlements_insert_own" ON public.settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_clerk_user_id()
    AND EXISTS (
      SELECT 1 FROM public.transaction_splits ts
      WHERE ts.id = settlements.transaction_split_id
        AND ts.user_id = public.current_clerk_user_id()
    )
    AND (
      settlements.account_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.accounts a
        WHERE a.id = settlements.account_id
          AND a.user_id = public.current_clerk_user_id()
      )
    )
  );

CREATE POLICY "settlements_update_own" ON public.settlements
  FOR UPDATE TO authenticated
  USING (user_id = public.current_clerk_user_id())
  WITH CHECK (user_id = public.current_clerk_user_id());

CREATE POLICY "settlements_delete_own" ON public.settlements
  FOR DELETE TO authenticated
  USING (user_id = public.current_clerk_user_id());

-- -----------------------------------------------------------------------------
-- 6. LEDGER TRIGGERS FOR TRANSACTIONS, SETTLEMENTS & REVERSALS
-- -----------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_settlement_balance_entry ON public.settlements;
CREATE TRIGGER trg_settlement_balance_entry
  AFTER INSERT ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_settlement_balance_entry();

-- Atomic reversal helper function (marks transaction cancelled and posts offsetting 'reversal' balance_entry)
CREATE OR REPLACE FUNCTION public.reverse_transaction_atomic(p_transaction_id UUID)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller TEXT := public.current_clerk_user_id();
  v_tx public.transactions;
  v_reversal_delta DECIMAL(12, 2);
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: missing Clerk JWT sub claim' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = v_caller
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found or access denied', p_transaction_id USING ERRCODE = '42501';
  END IF;

  IF v_tx.status = 'cancelled' THEN
    RAISE EXCEPTION 'Transaction % is already cancelled', p_transaction_id;
  END IF;

  UPDATE public.transactions
  SET status = 'cancelled',
      is_flagged = TRUE,
      flag_reason = COALESCE(flag_reason, 'Reversed')
  WHERE id = v_tx.id
  RETURNING * INTO v_tx;

  IF v_tx.type = 'income' THEN
    v_reversal_delta := -ABS(v_tx.amount);
  ELSE
    v_reversal_delta := ABS(v_tx.amount);
  END IF;

  INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
  VALUES (v_caller, v_tx.account_id, v_tx.id, v_reversal_delta, 'reversal');

  IF v_tx.type = 'transfer' AND v_tx.transfer_account_id IS NOT NULL THEN
    INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
    VALUES (v_caller, v_tx.transfer_account_id, v_tx.id, -ABS(v_tx.amount), 'reversal');
  END IF;

  RETURN v_tx;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_transaction_atomic(UUID) TO authenticated, service_role;

