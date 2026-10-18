-- ==============================================================================
-- Migration: Saldo Category & Account Budgets Ledger System
-- Schema: budgets(id, user_id, name, amount, category_id NULLABLE, account_id NULLABLE, period_type, period_start, period_end, created_at)
-- RLS: scoped to auth.jwt()->>'sub' = user_id, matching project pattern.
-- ==============================================================================

-- 1. Create table if not exists or alter to match schema
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID NULL REFERENCES public.accounts(id) ON DELETE SET NULL,
  period_type TEXT NOT NULL DEFAULT 'month',
  period_start TIMESTAMPTZ NULL,
  period_end TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all required columns exist and constraints match
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS account_id UUID NULL REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'month';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ NULL;
ALTER TABLE public.budgets ALTER COLUMN category_id DROP NOT NULL;

-- 2. Grants for Postgres roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 3. Row Level Security matching auth.jwt()->>'sub' = user_id
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_user_policy" ON public.budgets;
DROP POLICY IF EXISTS "Allow users to manage own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Allow users to manage budgets" ON public.budgets;
DROP POLICY IF EXISTS "budgets_allow_all" ON public.budgets;

CREATE POLICY "budgets_user_policy"
ON public.budgets
FOR ALL
TO authenticated, anon
USING (
  (auth.jwt()->>'sub') = user_id OR
  auth.uid()::text = user_id OR
  auth.role() = 'anon'
)
WITH CHECK (
  (auth.jwt()->>'sub') = user_id OR
  auth.uid()::text = user_id OR
  auth.role() = 'anon'
);
