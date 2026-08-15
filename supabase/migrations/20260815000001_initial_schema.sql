-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Periods (Monthly buckets)
CREATE TABLE public.periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Balance Entries (Append-only ledger rows)
CREATE TABLE public.balance_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('top_up', 'expense', 'settlement')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. People (Single-user contact ledger)
CREATE TABLE public.people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Transactions (Solo or group expense records)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Splits (Group expense breakdown headers)
CREATE TABLE public.splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount > 0),
    payer_id UUID REFERENCES public.people(id) ON DELETE SET NULL, -- NULL means the app user paid
    num_people INTEGER NOT NULL CHECK (num_people >= 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Debts (Who owes whom)
CREATE TABLE public.debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    split_id UUID NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    direction TEXT NOT NULL CHECK (direction IN ('owed_to_me', 'i_owe')),
    status TEXT NOT NULL CHECK (status IN ('open', 'partial', 'settled')) DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Debt Settlements (Granular debt resolution)
CREATE TABLE public.debt_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance_entry_id UUID REFERENCES public.balance_entries(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    mode TEXT NOT NULL CHECK (mode IN ('from_balance', 'separately')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Single-user point of view: user owns their records)
CREATE POLICY "Users manage own periods" ON public.periods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own balance entries" ON public.balance_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own people" ON public.people FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own splits" ON public.splits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own debts" ON public.debts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own debt settlements" ON public.debt_settlements FOR ALL USING (auth.uid() = user_id);