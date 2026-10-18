-- ==============================================================================
-- FIX: "permission denied for table categories" and enhance budgets table
-- Run this script in your Supabase Dashboard > SQL Editor.
-- ==============================================================================

-- 1. Grant table and schema permissions to Supabase roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 2. Configure RLS Policies on categories table (Permit all read & insert)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON public.categories;
CREATE POLICY "Allow public read categories"
ON public.categories FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public insert categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to insert categories" ON public.categories;
CREATE POLICY "Allow public insert categories"
ON public.categories FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to update categories" ON public.categories;
CREATE POLICY "Allow public update categories"
ON public.categories FOR UPDATE
TO anon, authenticated
USING (true);

-- 3. Configure RLS Policies on budgets table
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Allow users to manage budgets" ON public.budgets;
CREATE POLICY "Allow users to manage budgets"
ON public.budgets FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Add multi-dimensional tracking columns to budgets table
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period TEXT DEFAULT 'month';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS transaction_filter TEXT DEFAULT 'all';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS inclusion_mode TEXT DEFAULT 'all_matching';
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS selected_transaction_ids TEXT[];
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS description TEXT;

-- 5. Make category_id nullable for 'All Categories' overall budget
ALTER TABLE public.budgets ALTER COLUMN category_id DROP NOT NULL;
