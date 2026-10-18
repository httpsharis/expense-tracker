-- =============================================================================
-- Migration: 20261018000000_clear_user_data_function.sql
-- Purpose:
--   Provide an atomic, secure procedure to clear all user tracking data
--   (settlements, splits, groups, transactions, budgets, subscriptions, accounts)
--   so a user can start over from scratch with zero balance.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.clear_user_data(target_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strict tenant check: Caller must be the target user or service_role
  IF (COALESCE(auth.jwt() ->> 'sub', '') != target_user_id)
     AND current_user NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Permission denied: Cannot clear data for another user'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Settlements
  DELETE FROM public.settlements WHERE user_id = target_user_id;

  -- 2. Transaction splits
  DELETE FROM public.transaction_splits WHERE user_id = target_user_id;

  -- 3. Groups & members
  DELETE FROM public.group_members WHERE user_id = target_user_id;
  DELETE FROM public.groups WHERE user_id = target_user_id;

  -- 4. Transactions
  DELETE FROM public.transactions WHERE user_id = target_user_id;

  -- 5. Budgets & subscriptions
  DELETE FROM public.budgets WHERE user_id = target_user_id;
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;

  -- 6. Accounts (cascades to balance_entries cleanly)
  DELETE FROM public.accounts WHERE user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_user_data(text) TO authenticated, service_role;

