-- ==========================================
-- FIXED SCHEMA — aligned with Saldo's actual architecture:
-- append-only ledger, Clerk auth (registered as Supabase third-party provider),
-- real group splitting
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES (was "users" — id is the Clerk user ID, stored as text)
-- ==========================================
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY DEFAULT (auth.jwt()->>'sub'),
    email TEXT NOT NULL,
    name TEXT,
    image_url TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    month_start_day SMALLINT NOT NULL DEFAULT 1,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. ACCOUNTS (no stored balance — it's derived from balance_entries)
-- ==========================================
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'savings', 'wallet')),
    currency TEXT NOT NULL DEFAULT 'USD',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. CATEGORIES (was free-text on every table)
-- ==========================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- ==========================================
-- 4. BUDGETS
-- ==========================================
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    month_date DATE NOT NULL,
    last_alert_sent TIMESTAMPTZ,
    last_alert_threshold INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, category_id, month_date)
);

-- ==========================================
-- 5. SUBSCRIPTIONS
-- ==========================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')) DEFAULT 'monthly',
    renewal_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',
    remind_me BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 6. TRANSACTIONS (event record — no balance mutation happens here directly;
--    a trigger writes the corresponding balance_entries row)
-- ==========================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'cancelled')) DEFAULT 'completed',
    input_method TEXT NOT NULL CHECK (input_method IN ('manual', 'voice', 'scan', 'recurring')) DEFAULT 'manual',
    voice_transcript TEXT,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason TEXT,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    transfer_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 7. BALANCE_ENTRIES (append-only ledger — the single source of truth for balance)
-- ==========================================
CREATE TABLE public.balance_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    settlement_id UUID, -- set by settlement trigger, FK added after settlements table exists
    delta DECIMAL(14, 2) NOT NULL, -- signed: positive = credit, negative = debit
    reason TEXT NOT NULL CHECK (reason IN ('transaction', 'settlement', 'top_up', 'adjustment')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_balance_entries_account ON public.balance_entries(account_id, created_at);

-- Balances are derived, never read from a stored column:
-- SELECT COALESCE(SUM(delta), 0) FROM balance_entries WHERE account_id = ?
--
-- Sign convention for delta (enforced by trigger logic, not the DB itself):
--   reason = 'transaction' -> type 'income' is +amount, type 'expense' is -amount
--   reason = 'settlement'  -> direction 'owed_to_me' being settled is +amount
--                             (someone paid you back, balance goes up)
--                             direction 'i_owe' being settled is -amount
--                             (you paid someone back, balance goes down)
--   reason = 'top_up'      -> always +amount
--   reason = 'adjustment'  -> sign depends on the correction being made

-- ==========================================
-- 8. GROUPS & GROUP_MEMBERS (real many-to-many, not pairwise "people")
-- ==========================================
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- creator/owner
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- who owns this record
    name TEXT NOT NULL, -- display name of the member (may not have their own profile)
    linked_profile_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL, -- optional, if they're also a Saldo user
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 9. TRANSACTION_SPLITS (one row per participant, not just a headcount)
-- ==========================================
CREATE TABLE public.transaction_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
    share_amount DECIMAL(12, 2) NOT NULL CHECK (share_amount > 0),
    is_payer BOOLEAN NOT NULL DEFAULT FALSE, -- who actually paid the vendor
    -- direction is from the current user's point of view on THIS row:
    --   'owed_to_me' -> you paid the vendor, this group_member owes you their share
    --   'i_owe'      -> the group_member paid the vendor, you owe them your share
    direction TEXT NOT NULL CHECK (direction IN ('owed_to_me', 'i_owe')),
    status TEXT NOT NULL CHECK (status IN ('open', 'partial', 'settled')) DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 10. SETTLEMENTS (explicit settle-from-balance vs settle-separately)
-- ==========================================
CREATE TABLE public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_split_id UUID NOT NULL REFERENCES public.transaction_splits(id) ON DELETE CASCADE,
    -- settlement_mode = 'from_balance' -> a balance_entries row IS written (delta sign
    --   follows the split's direction, see balance_entries comment above)
    -- settlement_mode = 'separate'     -> no balance_entries row is written at all;
    --   only transaction_splits.status moves to 'settled'
    settlement_mode TEXT NOT NULL CHECK (settlement_mode IN ('from_balance', 'separate')),
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL, -- required only when mode = 'from_balance'
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT settlement_mode_account_check CHECK (
        (settlement_mode = 'from_balance' AND account_id IS NOT NULL)
        OR (settlement_mode = 'separate' AND account_id IS NULL)
    )
);

ALTER TABLE public.balance_entries
    ADD CONSTRAINT fk_balance_entries_settlement
    FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE CASCADE;

-- ==========================================
-- 11. ROW LEVEL SECURITY (Clerk: compare the token's "sub" claim, not auth.uid())
-- ==========================================
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

CREATE POLICY "own profile" ON public.profiles FOR ALL USING ((auth.jwt()->>'sub') = id);
CREATE POLICY "own accounts" ON public.accounts FOR ALL USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "own categories" ON public.categories FOR ALL USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "own budgets" ON public.budgets FOR ALL USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "own subscriptions" ON public.subscriptions FOR ALL USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "own transactions" ON public.transactions FOR ALL USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "own balance entries" ON public.balance_entries FOR SELECT USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "insert own balance entries" ON public.balance_entries FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = user_id);
-- NOTE: no UPDATE or DELETE policies on balance_entries — this maintains the append-only ledger invariant.
CREATE POLICY "own groups" ON public.groups FOR ALL USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "own group members" ON public.group_members FOR ALL USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "own splits" ON public.transaction_splits FOR ALL USING ((auth.jwt()->>'sub') = user_id);
CREATE POLICY "own settlements" ON public.settlements FOR ALL USING ((auth.jwt()->>'sub') = user_id);

-- ==========================================
-- 12. INDEXES
-- ==========================================
CREATE INDEX idx_accounts_user ON public.accounts(user_id);
CREATE UNIQUE INDEX idx_accounts_user_default ON public.accounts(user_id) WHERE is_default = TRUE;
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transaction_splits_transaction ON public.transaction_splits(transaction_id);
CREATE INDEX idx_transaction_splits_status ON public.transaction_splits(user_id, status);
CREATE INDEX idx_settlements_split ON public.settlements(transaction_split_id);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id, status);
CREATE INDEX idx_budgets_user_month ON public.budgets(user_id, month_date);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

-- ==========================================
-- 13. TRIGGERS FOR APPEND-ONLY LEDGER (SECURITY DEFINER)
-- ==========================================

-- Trigger function for transactions -> balance_entries
CREATE OR REPLACE FUNCTION public.handle_transaction_balance_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only write balance entries for completed transactions
    IF NEW.status = 'completed' THEN
        IF NEW.type = 'income' THEN
            INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
            VALUES (NEW.user_id, NEW.account_id, NEW.id, NEW.amount, 'transaction');
        ELSIF NEW.type = 'expense' THEN
            INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
            VALUES (NEW.user_id, NEW.account_id, NEW.id, -NEW.amount, 'transaction');
        ELSIF NEW.type = 'transfer' THEN
            -- Debit origin account
            INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
            VALUES (NEW.user_id, NEW.account_id, NEW.id, -NEW.amount, 'transaction');
            
            -- Credit destination account (if provided)
            IF NEW.transfer_account_id IS NOT NULL THEN
                INSERT INTO public.balance_entries (user_id, account_id, transaction_id, delta, reason)
                VALUES (NEW.user_id, NEW.transfer_account_id, NEW.id, NEW.amount, 'transaction');
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transaction_balance_entry ON public.transactions;
CREATE TRIGGER trg_transaction_balance_entry
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_transaction_balance_entry();

-- Trigger function for settlements -> balance_entries
CREATE OR REPLACE FUNCTION public.handle_settlement_balance_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_split_direction TEXT;
    v_share_amount DECIMAL(12, 2);
    v_total_settled DECIMAL(12, 2);
BEGIN
    -- Fetch direction and share amount from the referenced split
    SELECT direction, share_amount
    INTO v_split_direction, v_share_amount
    FROM public.transaction_splits
    WHERE id = NEW.transaction_split_id;

    -- If settled from balance, write ledger entry
    IF NEW.settlement_mode = 'from_balance' AND NEW.account_id IS NOT NULL THEN
        IF v_split_direction = 'owed_to_me' THEN
            INSERT INTO public.balance_entries (user_id, account_id, settlement_id, delta, reason)
            VALUES (NEW.user_id, NEW.account_id, NEW.id, NEW.amount, 'settlement');
        ELSIF v_split_direction = 'i_owe' THEN
            INSERT INTO public.balance_entries (user_id, account_id, settlement_id, delta, reason)
            VALUES (NEW.user_id, NEW.account_id, NEW.id, -NEW.amount, 'settlement');
        END IF;
    END IF;

    -- Update split settlement status
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

-- ==========================================
-- 14. TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();