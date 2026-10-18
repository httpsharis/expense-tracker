-- =============================================================================
-- Migration: 20261014201500_fix_permissions_and_grants.sql
-- Resolves: "permission denied for table transactions" and missing "tags" column
-- =============================================================================

-- 1. Ensure 'tags' column exists on transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- 2. Grant table and schema usage to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.balance_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.accounts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.budgets TO anon, authenticated, service_role;

-- Grant on splits & groups tables if present
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'groups') THEN
    GRANT ALL ON TABLE public.groups TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_members') THEN
    GRANT ALL ON TABLE public.group_members TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transaction_splits') THEN
    GRANT ALL ON TABLE public.transaction_splits TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settlements') THEN
    GRANT ALL ON TABLE public.settlements TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    GRANT ALL ON TABLE public.subscriptions TO anon, authenticated, service_role;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
  END IF;
END $$;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 3. Row Level Security for transactions (works with both Clerk JWT & anon fallback)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
CREATE POLICY "transactions_select_policy" ON public.transactions
  FOR SELECT TO authenticated, anon
  USING (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR (auth.jwt() IS NULL AND user_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
CREATE POLICY "transactions_insert_policy" ON public.transactions
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
CREATE POLICY "transactions_update_policy" ON public.transactions
  FOR UPDATE TO authenticated, anon
  USING (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR (auth.jwt() IS NULL AND user_id IS NOT NULL)
  )
  WITH CHECK (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR user_id IS NOT NULL
  );

DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;
CREATE POLICY "transactions_delete_policy" ON public.transactions
  FOR DELETE TO authenticated, anon
  USING (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR (auth.jwt() IS NULL AND user_id IS NOT NULL)
  );

-- 4. Row Level Security for balance_entries (append-only ledger)
ALTER TABLE public.balance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "balance_entries_select_policy" ON public.balance_entries;
CREATE POLICY "balance_entries_select_policy" ON public.balance_entries
  FOR SELECT TO authenticated, anon
  USING (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR (auth.jwt() IS NULL AND user_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "balance_entries_insert_policy" ON public.balance_entries;
CREATE POLICY "balance_entries_insert_policy" ON public.balance_entries
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR user_id IS NOT NULL
  );

-- 5. Trigger Function with SECURITY DEFINER so triggers can update balance_entries safely
CREATE OR REPLACE FUNCTION public.handle_transaction_balance_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.status = 'completed' THEN
      IF NEW.type = 'expense' THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.account_id, NEW.id, -ABS(NEW.amount), 'expense');
      ELSIF NEW.type = 'income' THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.account_id, NEW.id, ABS(NEW.amount), 'income');
      ELSIF NEW.type = 'transfer' AND NEW.transfer_account_id IS NOT NULL THEN
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.account_id, NEW.id, -ABS(NEW.amount), 'transfer_out');
        INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
        VALUES (NEW.user_id, NEW.transfer_account_id, NEW.id, ABS(NEW.amount), 'transfer_in');
      END IF;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.balance_entries WHERE transaction_id = OLD.id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_transaction_balance_entry ON public.transactions;
CREATE TRIGGER trg_transaction_balance_entry
AFTER INSERT OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_balance_entry();

