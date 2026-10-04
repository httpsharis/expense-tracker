-- ─────────────────────────────────────────────────────────────
-- MIGRATION: Transactions, Budgets & Ledger Pipeline
-- 1. Upgrade budgets table schema (adds name, account_id, period)
-- 2. Grant schema & table permissions to anon & authenticated roles
-- 3. Row Level Security policies compatible with Clerk & Supabase Auth
-- 4. Automatic ledger trigger (transactions -> balance_entries)
-- ─────────────────────────────────────────────────────────────

-- 1. UPGRADE BUDGETS TABLE SCHEMA
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS name text DEFAULT 'Budget';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_type text DEFAULT 'month';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_start date;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_end date;
ALTER TABLE public.budgets ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.budgets ALTER COLUMN month_date DROP NOT NULL;

-- 2. SCHEMA & TABLE PRIVILEGES FOR POSTGREST ROLES
-- (Resolves: "permission denied for table transactions / budgets")
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.balance_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.budgets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.accounts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 3. ROW LEVEL SECURITY (RLS) FOR TRANSACTIONS
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
    OR user_id IS NOT NULL
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
    OR user_id IS NOT NULL
  );

-- 4. ROW LEVEL SECURITY (RLS) FOR BALANCE_ENTRIES
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

-- 5. ROW LEVEL SECURITY (RLS) FOR BUDGETS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_all_policy" ON public.budgets;
CREATE POLICY "budgets_all_policy" ON public.budgets
  FOR ALL TO authenticated, anon
  USING (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR user_id IS NOT NULL
  )
  WITH CHECK (
    user_id = (auth.jwt()->>'sub')
    OR user_id = auth.uid()::text
    OR user_id IS NOT NULL
  );

-- 6. AUTOMATIC LEDGER TRIGGER (TRANSACTIONS -> BALANCE_ENTRIES)
CREATE OR REPLACE FUNCTION public.handle_transaction_balance_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
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
