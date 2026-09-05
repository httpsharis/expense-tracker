-- =============================================================================
-- SALDO — Optimize balance queries
-- Builds on 20260815000001_initial_schema.sql (already applied).
-- =============================================================================

drop index if exists public.balance_entries_account_id_idx;

create index balance_entries_account_id_created_at_idx
  on public.balance_entries(account_id, created_at desc);

create function public.get_account_balance(p_account_id uuid)
returns numeric(12,2)
language sql
stable
as $$
  select coalesce(sum(amount), 0)::numeric(12,2)
  from public.balance_entries
  where account_id = p_account_id;
$$;
