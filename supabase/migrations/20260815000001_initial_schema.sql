-- =============================================================================
-- SALDO — Initial Schema Migration
-- =============================================================================
-- ARCHITECTURE NOTE (read this first):
--
-- accounts.balance is NEVER stored. Balance is always DERIVED by summing
-- signed rows in balance_entries. This is the core decision from DESIGN.md:
-- it lets us separate "did this expense happen" (transactions) from
-- "is this money currently mine" (balance_entries) — the whole point of Saldo.
--
-- To make that safe in practice, transactions and settlements don't write
-- balance_entries themselves from the app. Triggers do it, inside the same
-- transaction as the insert. That way it's IMPOSSIBLE to record a transaction
-- and forget to update the ledger — the database enforces it, not your app code.
-- (Trade-off: triggers are less visible than app code. Comments below explain
-- each one so you can trace the logic.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gives us gen_random_uuid()


-- -----------------------------------------------------------------------------
-- PROFILES
-- One row per Supabase auth user. We keep this separate from auth.users
-- because auth.users is managed by Supabase Auth and lives in a different
-- schema — you generally don't query/join it directly from app code.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  last_name   text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
-- This is the standard Supabase pattern — without it you'd have to remember
-- to insert a profile row manually right after every signup call.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- ACCOUNTS
-- Represents a "wallet" — cash, a bank account, etc. NOTE: no balance column.
-- -----------------------------------------------------------------------------
create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('CASH', 'BANK', 'WALLET')),
  created_at  timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts(user_id);


-- -----------------------------------------------------------------------------
-- CATEGORIES
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('INCOME', 'EXPENSE')),
  created_at  timestamptz not null default now()
);

create index categories_user_id_idx on public.categories(user_id);


-- -----------------------------------------------------------------------------
-- TRANSACTIONS
-- The "did this expense happen" record. This is a fact — it never changes
-- based on who owes whom. It's the source of truth for spending history.
-- -----------------------------------------------------------------------------
create table public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  account_id        uuid not null references public.accounts(id) on delete cascade,
  category_id       uuid references public.categories(id) on delete set null,
  amount            numeric(12,2) not null check (amount > 0), -- always positive; `type` carries direction
  type              text not null check (type in ('INCOME', 'EXPENSE', 'TRANSFER')),
  description       text,
  transaction_date  date not null default current_date,
  created_at        timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_account_id_idx on public.transactions(account_id);

-- TRIGGER: every transaction writes exactly one balance_entries row.
-- INCOME -> positive entry, EXPENSE -> negative entry.
-- (TRANSFER between two of the user's own accounts is out of scope for this
-- migration — add a second entry here later when you build that feature.)
create function public.handle_transaction_balance_entry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.balance_entries (account_id, transaction_id, amount, entry_type)
  values (
    new.account_id,
    new.id,
    case new.type
      when 'INCOME'  then new.amount
      when 'EXPENSE' then -new.amount
      else 0 -- TRANSFER: handled separately once that feature exists
    end,
    'TRANSACTION'
  );
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- BALANCE_ENTRIES
-- The append-only ledger. Never updated, never deleted (in the app — see RLS
-- below, which blocks update/delete entirely). Balance for an account is
-- SUM(amount) over its rows. Defined AFTER transactions because its trigger
-- function references it, but the trigger itself is attached below once both
-- tables exist.
-- -----------------------------------------------------------------------------
create table public.balance_entries (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  transaction_id  uuid references public.transactions(id) on delete cascade,
  settlement_id   uuid, -- FK added after settlements table exists (see below)
  amount          numeric(12,2) not null, -- signed: + increases balance, - decreases
  entry_type      text not null check (entry_type in ('TRANSACTION', 'TOPUP', 'SETTLEMENT', 'ADJUSTMENT')),
  created_at      timestamptz not null default now()
);

create index balance_entries_account_id_idx on public.balance_entries(account_id);

-- Now that balance_entries exists, attach the trigger from the transactions section.
create trigger on_transaction_created
  after insert on public.transactions
  for each row execute function public.handle_transaction_balance_entry();

-- A convenience view: current balance per account, derived on the fly.
-- Query this instead of doing SUM(...) by hand in every screen.
create view public.account_balances as
select
  a.id as account_id,
  a.user_id,
  a.name,
  coalesce(sum(be.amount), 0)::numeric(12,2) as balance
from public.accounts a
left join public.balance_entries be on be.account_id = a.id
group by a.id, a.user_id, a.name;


-- -----------------------------------------------------------------------------
-- GROUPS + GROUP_MEMBERS
-- -----------------------------------------------------------------------------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  primary key (group_id, user_id)
);


-- -----------------------------------------------------------------------------
-- TRANSACTION_SPLITS
-- "Is this money owed" — separate from the transaction fact above.
-- -----------------------------------------------------------------------------
create table public.transaction_splits (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  debtor_id       uuid not null references public.profiles(id) on delete cascade,
  amount_owed     numeric(12,2) not null check (amount_owed > 0),
  is_settled      boolean not null default false,
  settled_at      timestamptz
);

create index transaction_splits_transaction_id_idx on public.transaction_splits(transaction_id);
create index transaction_splits_debtor_id_idx on public.transaction_splits(debtor_id);


-- -----------------------------------------------------------------------------
-- SETTLEMENTS
-- This is where Saldo's core differentiator actually lives: settlement_mode.
--   FROM_BALANCE -> money moves through the tracked pocket-money balance,
--                   so we write a balance_entries row (deduct from payer).
--   SEPARATE     -> debt is marked paid but never touches the balance —
--                   e.g. "we settled up in cash outside the app."
-- -----------------------------------------------------------------------------
create table public.settlements (
  id                uuid primary key default gen_random_uuid(),
  transaction_id    uuid references public.transactions(id) on delete set null,
  payer_id          uuid not null references public.profiles(id) on delete cascade,
  payee_id          uuid not null references public.profiles(id) on delete cascade,
  amount            numeric(12,2) not null check (amount > 0),
  settlement_mode   text not null check (settlement_mode in ('FROM_BALANCE', 'SEPARATE')),
  account_id        uuid references public.accounts(id), -- required only when mode = FROM_BALANCE
  created_at        timestamptz not null default now(),
  constraint settlement_account_required check (
    settlement_mode = 'SEPARATE' or account_id is not null
  )
);

alter table public.balance_entries
  add constraint balance_entries_settlement_id_fkey
  foreign key (settlement_id) references public.settlements(id) on delete cascade;

-- TRIGGER: only FROM_BALANCE settlements touch the ledger. This is the
-- database-level enforcement of the pocket-money-vs-obligation split —
-- a SEPARATE settlement physically cannot create a balance_entries row.
create function public.handle_settlement_balance_entry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.settlement_mode = 'FROM_BALANCE' then
    insert into public.balance_entries (account_id, settlement_id, amount, entry_type)
    values (new.account_id, new.id, -new.amount, 'SETTLEMENT');
  end if;
  return new;
end;
$$;

create trigger on_settlement_created
  after insert on public.settlements
  for each row execute function public.handle_settlement_balance_entry();


-- =============================================================================
-- ROW LEVEL SECURITY
-- Pattern: users can only read/write rows tied to their own user_id, EXCEPT
-- balance_entries, which is insert-only for the trigger (owner) role and
-- read-only for users — nobody edits the ledger directly, ever.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.balance_entries enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.transaction_splits enable row level security;
alter table public.settlements enable row level security;

-- profiles: read anyone (needed to show names in group splits), write only self
create policy "profiles are viewable by authenticated users"
  on public.profiles for select using (auth.role() = 'authenticated');
create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- accounts: fully owned by user
create policy "users manage own accounts"
  on public.accounts for all using (auth.uid() = user_id);

-- categories: fully owned by user
create policy "users manage own categories"
  on public.categories for all using (auth.uid() = user_id);

-- transactions: fully owned by user
create policy "users manage own transactions"
  on public.transactions for all using (auth.uid() = user_id);

-- balance_entries: read-only from the client; inserts happen only via the
-- SECURITY DEFINER trigger functions above, which bypass RLS.
create policy "users view own balance entries"
  on public.balance_entries for select
  using (
    account_id in (select id from public.accounts where user_id = auth.uid())
  );

-- groups: visible to members, created by any authenticated user
create policy "group members can view group"
  on public.groups for select
  using (
    id in (select group_id from public.group_members where user_id = auth.uid())
  );
create policy "authenticated users can create groups"
  on public.groups for insert with check (auth.uid() = created_by);

-- group_members: visible to other members of the same group
create policy "group members can view membership"
  on public.group_members for select
  using (
    group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

-- transaction_splits: visible to the debtor and to the transaction's owner
create policy "splits visible to debtor or transaction owner"
  on public.transaction_splits for select
  using (
    auth.uid() = debtor_id
    or transaction_id in (select id from public.transactions where user_id = auth.uid())
  );
create policy "transaction owner manages splits"
  on public.transaction_splits for all
  using (
    transaction_id in (select id from public.transactions where user_id = auth.uid())
  );

-- settlements: visible to payer or payee
create policy "settlements visible to payer or payee"
  on public.settlements for select
  using (auth.uid() = payer_id or auth.uid() = payee_id);
create policy "payer or payee can create settlement"
  on public.settlements for insert
  with check (auth.uid() = payer_id or auth.uid() = payee_id);