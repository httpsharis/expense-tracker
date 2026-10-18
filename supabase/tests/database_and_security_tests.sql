-- =============================================================================
-- SALDO DATABASE & SECURITY VERIFICATION SUITE
-- File: supabase/tests/database_and_security_tests.sql
--
-- How to run:
--   1. First apply `supabase/migrations/20261017000000_strict_rls_ledger_immutability_and_group_visibility.sql`
--   2. Paste and run this entire script in the Supabase SQL Editor (or via `psql`).
--   3. Everything runs inside `BEGIN ... ROLLBACK` so zero test data is left behind.
--      If any security boundary, constraint, or trigger fails, an explicit
--      `RAISE EXCEPTION` halts execution with the exact failure reason.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_user_a TEXT := 'test_user_a_clerk_sub';
  v_user_b TEXT := 'test_user_b_clerk_sub';
  v_user_c TEXT := 'test_user_c_outsider_sub';

  v_acc_a1 UUID := gen_random_uuid();
  v_acc_a2 UUID := gen_random_uuid();
  v_acc_b1 UUID := gen_random_uuid();

  v_cat_a UUID := gen_random_uuid();
  v_cat_b UUID := gen_random_uuid();

  v_tx_a_expense UUID := gen_random_uuid();
  v_tx_a_income UUID := gen_random_uuid();
  v_tx_a_transfer UUID := gen_random_uuid();
  v_tx_b_expense UUID := gen_random_uuid();

  v_group_a UUID := gen_random_uuid();
  v_group_b UUID := gen_random_uuid();

  v_member_a_in_b UUID := gen_random_uuid();
  v_member_b_in_a UUID := gen_random_uuid();
  v_member_b_self UUID := gen_random_uuid();

  v_split_a UUID := gen_random_uuid();
  v_split_b UUID := gen_random_uuid();

  v_settlement_a UUID := gen_random_uuid();
  v_settlement_b UUID := gen_random_uuid();

  v_count INTEGER;
  v_balance DECIMAL(14, 2);
  v_split_status TEXT;
  v_caught BOOLEAN;
BEGIN
  -- ===========================================================================
  -- SETUP: Seed User A, User B, and User C (Outsider) profiles
  -- ===========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
  INSERT INTO public.profiles (id, email, name, currency)
  VALUES (v_user_a, 'user_a@saldo.test', 'User A', 'PKR');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);
  INSERT INTO public.profiles (id, email, name, currency)
  VALUES (v_user_b, 'user_b@saldo.test', 'User B', 'PKR');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_c, 'role', 'authenticated')::text, true);
  INSERT INTO public.profiles (id, email, name, currency)
  VALUES (v_user_c, 'user_c@saldo.test', 'User C Outsider', 'PKR');

  -- Seed User B's private data (Account, Category, Transaction, Group, Split, Settlement)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);

  INSERT INTO public.accounts (id, user_id, name, type, currency, is_default)
  VALUES (v_acc_b1, v_user_b, 'User B Private Bank', 'bank', 'PKR', true);

  INSERT INTO public.balance_entries (user_id, account_id, delta, reason)
  VALUES (v_user_b, v_acc_b1, 50000.00, 'top_up');

  INSERT INTO public.categories (id, user_id, name, icon)
  VALUES (v_cat_b, v_user_b, 'B Secret Category', '🔒');

  INSERT INTO public.transactions (id, user_id, account_id, category_id, type, amount, description, status)
  VALUES (v_tx_b_expense, v_user_b, v_acc_b1, v_cat_b, 'expense', 1200.00, 'User B Private Expense', 'completed');

  INSERT INTO public.groups (id, user_id, name)
  VALUES (v_group_b, v_user_b, 'User B Solo Group');

  INSERT INTO public.group_members (id, group_id, user_id, name)
  VALUES (v_member_b_self, v_group_b, v_user_b, 'Friend of B');

  INSERT INTO public.transaction_splits (id, user_id, transaction_id, group_member_id, share_amount, direction, status)
  VALUES (v_split_b, v_user_b, v_tx_b_expense, v_member_b_self, 600.00, 'owed_to_me', 'open');

  INSERT INTO public.settlements (id, user_id, transaction_split_id, settlement_mode, account_id, amount)
  VALUES (v_settlement_b, v_user_b, v_split_b, 'from_balance', v_acc_b1, 600.00);

  -- Switch role to `authenticated` so RLS is strictly enforced for all tests below
  EXECUTE 'SET LOCAL ROLE authenticated';

  -- ===========================================================================
  -- TEST 1: CROSS-USER ISOLATION (User A token vs User B data)
  -- Confirm User A can NEVER read or write User B's profiles, accounts,
  -- transactions, groups, or settlements via direct Supabase queries.
  -- ===========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);

  -- 1A. User A cannot SELECT User B's rows
  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id = v_user_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A read User B profile!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.accounts WHERE user_id = v_user_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A read User B accounts!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.transactions WHERE user_id = v_user_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A read User B transactions!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.groups WHERE id = v_group_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A read User B private group!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.settlements WHERE user_id = v_user_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A read User B settlements!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.balance_entries WHERE user_id = v_user_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A read User B balance_entries!';
  END IF;

  -- 1B. User A cannot INSERT rows impersonating User B
  v_caught := false;
  BEGIN
    INSERT INTO public.accounts (user_id, name, type, currency)
    VALUES (v_user_b, 'Spoofed Account', 'cash', 'PKR');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A inserted an account for User B!';
  END IF;

  v_caught := false;
  BEGIN
    INSERT INTO public.transactions (user_id, account_id, type, amount, status)
    VALUES (v_user_b, v_acc_b1, 'expense', 500.00, 'completed');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A inserted a transaction for User B!';
  END IF;

  v_caught := false;
  BEGIN
    INSERT INTO public.groups (user_id, name)
    VALUES (v_user_b, 'Spoofed Group');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A inserted a group for User B!';
  END IF;

  v_caught := false;
  BEGIN
    INSERT INTO public.settlements (user_id, transaction_split_id, settlement_mode, account_id, amount)
    VALUES (v_user_b, v_split_b, 'from_balance', v_acc_b1, 100.00);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A inserted a settlement for User B!';
  END IF;

  -- 1C. User A cannot UPDATE or DELETE User B's rows
  UPDATE public.profiles SET name = 'Hacked' WHERE id = v_user_b;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A updated User B profile!';
  END IF;

  DELETE FROM public.transactions WHERE id = v_tx_b_expense;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: User A deleted User B transaction!';
  END IF;

  RAISE NOTICE '✅ TEST 1 PASSED: User A cannot read or write User B profiles, accounts, transactions, groups, or settlements.';

  -- ===========================================================================
  -- TEST 2: TRIGGERS & REVERSAL BALANCE MATH (User A's own ledger)
  -- Verify triggers write ledger entries on transaction & settlement inserts,
  -- and that a reversal produces the exact restored balance.
  -- ===========================================================================
  INSERT INTO public.accounts (id, user_id, name, type, currency, is_default)
  VALUES
    (v_acc_a1, v_user_a, 'User A Main Bank', 'bank', 'PKR', true),
    (v_acc_a2, v_user_a, 'User A Cash Wallet', 'cash', 'PKR', false);

  INSERT INTO public.categories (id, user_id, name, icon)
  VALUES (v_cat_a, v_user_a, 'Food', '🍔');

  -- Initial top-up: +10,000.00
  INSERT INTO public.balance_entries (user_id, account_id, delta, reason)
  VALUES (v_user_a, v_acc_a1, 10000.00, 'top_up');

  -- Expense: -2,500.00 -> Expected Bank balance: 7,500.00
  INSERT INTO public.transactions (id, user_id, account_id, category_id, type, amount, description, status)
  VALUES (v_tx_a_expense, v_user_a, v_acc_a1, v_cat_a, 'expense', 2500.00, 'Team Dinner', 'completed');

  -- Income: +1,500.00 -> Expected Bank balance: 9,000.00
  INSERT INTO public.transactions (id, user_id, account_id, category_id, type, amount, description, status)
  VALUES (v_tx_a_income, v_user_a, v_acc_a1, v_cat_a, 'income', 1500.00, 'Freelance Bonus', 'completed');

  -- Transfer: -1,000.00 from Bank to Cash Wallet -> Expected Bank: 8,000.00, Wallet: 1,000.00
  INSERT INTO public.transactions (id, user_id, account_id, transfer_account_id, type, amount, description, status)
  VALUES (v_tx_a_transfer, v_user_a, v_acc_a1, v_acc_a2, 'transfer', 1000.00, 'ATM Withdrawal', 'completed');

  SELECT COALESCE(SUM(delta), 0) INTO v_balance FROM public.balance_entries WHERE account_id = v_acc_a1;
  IF v_balance <> 8000.00 THEN
    RAISE EXCEPTION 'TRIGGER FAILURE: Expected Bank balance 8000.00 after transactions, got %', v_balance;
  END IF;

  SELECT COALESCE(SUM(delta), 0) INTO v_balance FROM public.balance_entries WHERE account_id = v_acc_a2;
  IF v_balance <> 1000.00 THEN
    RAISE EXCEPTION 'TRIGGER FAILURE: Expected Wallet balance 1000.00 after transfer, got %', v_balance;
  END IF;

  -- Create a Group & Split where User B owes User A 500.00, then settle `from_balance`
  INSERT INTO public.groups (id, user_id, name)
  VALUES (v_group_a, v_user_a, 'Shared Dinner Group');

  INSERT INTO public.group_members (id, group_id, user_id, name, linked_profile_id)
  VALUES (v_member_b_in_a, v_group_a, v_user_a, 'User B', v_user_b);

  INSERT INTO public.transaction_splits (id, user_id, transaction_id, group_member_id, share_amount, direction, status)
  VALUES (v_split_a, v_user_a, v_tx_a_expense, v_member_b_in_a, 500.00, 'owed_to_me', 'open');

  -- Settlement (`from_balance`, +500.00) -> Expected Bank balance: 8,500.00, split status: 'settled'
  INSERT INTO public.settlements (id, user_id, transaction_split_id, settlement_mode, account_id, amount)
  VALUES (v_settlement_a, v_user_a, v_split_a, 'from_balance', v_acc_a1, 500.00);

  SELECT COALESCE(SUM(delta), 0) INTO v_balance FROM public.balance_entries WHERE account_id = v_acc_a1;
  IF v_balance <> 8500.00 THEN
    RAISE EXCEPTION 'TRIGGER FAILURE: Expected Bank balance 8500.00 after settlement, got %', v_balance;
  END IF;

  SELECT status INTO v_split_status FROM public.transaction_splits WHERE id = v_split_a;
  IF v_split_status <> 'settled' THEN
    RAISE EXCEPTION 'TRIGGER FAILURE: Expected split status ''settled'', got %', v_split_status;
  END IF;

  -- Reverse the 2,500.00 expense via `reverse_transaction_atomic` -> Expected Bank balance: 11,000.00
  PERFORM public.reverse_transaction_atomic(v_tx_a_expense);

  SELECT COALESCE(SUM(delta), 0) INTO v_balance FROM public.balance_entries WHERE account_id = v_acc_a1;
  IF v_balance <> 11000.00 THEN
    RAISE EXCEPTION 'REVERSAL FAILURE: Expected Bank balance 11000.00 after reversing 2500.00 expense, got %', v_balance;
  END IF;

  RAISE NOTICE '✅ TEST 2 PASSED: Triggers accurately record transaction, transfer, settlement, and reversal ledger entries.';

  -- ===========================================================================
  -- TEST 3: DELIBERATE CONSTRAINT VIOLATIONS & LEDGER IMMUTABILITY
  -- Try to violate constraints on purpose:
  --   a) Settlement with `from_balance` and NULL `account_id`
  --   b) Settlement with `separate` and non-NULL `account_id`
  --   c) Invalid `reason` in `balance_entries`
  --   d) UPDATE on `balance_entries`
  --   e) DELETE on `balance_entries`
  -- All MUST be rejected!
  -- ===========================================================================

  -- 3A. Settlement with `from_balance` and no account_id
  v_caught := false;
  BEGIN
    INSERT INTO public.settlements (user_id, transaction_split_id, settlement_mode, account_id, amount)
    VALUES (v_user_a, v_split_a, 'from_balance', NULL, 100.00);
  EXCEPTION WHEN check_violation THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'CONSTRAINT FAILURE: Settlement with from_balance and NULL account_id was not rejected!';
  END IF;

  -- 3B. Settlement with `separate` and an account_id
  v_caught := false;
  BEGIN
    INSERT INTO public.settlements (user_id, transaction_split_id, settlement_mode, account_id, amount)
    VALUES (v_user_a, v_split_a, 'separate', v_acc_a1, 100.00);
  EXCEPTION WHEN check_violation THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'CONSTRAINT FAILURE: Settlement with separate mode and non-NULL account_id was not rejected!';
  END IF;

  -- 3C. Invalid reason in `balance_entries`
  v_caught := false;
  BEGIN
    INSERT INTO public.balance_entries (user_id, account_id, delta, reason)
    VALUES (v_user_a, v_acc_a1, 100.00, 'invalid_reason');
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'CONSTRAINT FAILURE: balance_entries row with invalid reason was not rejected!';
  END IF;

  -- 3D. Direct UPDATE on `balance_entries` (Append-Only Ledger Violation)
  v_caught := false;
  BEGIN
    UPDATE public.balance_entries SET delta = 999999.00 WHERE account_id = v_acc_a1;
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'IMMUTABILITY FAILURE: UPDATE on balance_entries was not rejected!';
  END IF;

  -- 3E. Direct DELETE on `balance_entries` (Append-Only Ledger Violation)
  v_caught := false;
  BEGIN
    DELETE FROM public.balance_entries WHERE account_id = v_acc_a1;
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'IMMUTABILITY FAILURE: DELETE on balance_entries was not rejected!';
  END IF;

  RAISE NOTICE '✅ TEST 3 PASSED: All invalid constraints and ledger UPDATE/DELETE mutations were strictly rejected.';

  -- ===========================================================================
  -- TEST 4: GROUP MEMBER VISIBILITY vs NON-MEMBER ISOLATION
  -- Confirm linked group member (User B) can see group data for `v_group_a`,
  -- while non-member (User C) cannot see any group data.
  -- ===========================================================================

  -- Switch to User B (who is a linked member of User A's `v_group_a`)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.groups WHERE id = v_group_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'GROUP VISIBILITY FAILURE: Linked group member User B could not see group v_group_a!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.group_members WHERE group_id = v_group_a;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'GROUP VISIBILITY FAILURE: Linked group member User B could not see members of v_group_a!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.transaction_splits WHERE id = v_split_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'GROUP VISIBILITY FAILURE: Linked group member User B could not see split in v_group_a!';
  END IF;

  -- Switch to User C (Non-member outsider)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_c, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.groups WHERE id IN (v_group_a, v_group_b);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'GROUP ISOLATION FAILURE: Non-member User C was able to see groups!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.group_members WHERE group_id IN (v_group_a, v_group_b);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'GROUP ISOLATION FAILURE: Non-member User C was able to see group members!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.transaction_splits WHERE id IN (v_split_a, v_split_b);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'GROUP ISOLATION FAILURE: Non-member User C was able to see group splits!';
  END IF;

  RAISE NOTICE '✅ TEST 4 PASSED: Group members can view shared group data while non-members are completely blocked.';
END $$;

ROLLBACK;

