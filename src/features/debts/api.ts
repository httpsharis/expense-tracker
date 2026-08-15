import { supabase } from '@shared/lib/supabase';
import { Database } from '@shared/types/database.types';

export type DebtRow = Database['public']['Tables']['debts']['Row'];
export interface Debt extends DebtRow {
    person?: { name: string };
}

export interface SettlePayload {
    debtId: string;
    amount: number;
    mode: 'from_balance' | 'separately';
    periodId: string;
}

export async function fetchDebts(): Promise<Debt[]> {
    const { data, error } = await supabase
        .from('debts')
        .select('*, person:people(name)')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as unknown as Debt[]) || [];
}

export async function settleDebt({ debtId, amount, mode, periodId }: SettlePayload): Promise<void> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    let balanceEntryId: string | null = null;

    if (mode === 'from_balance') {
        const { data: entry, error: entryError } = await supabase
            .from('balance_entries')
            .insert({
                period_id: periodId,
                user_id: userData.user.id,
                amount,
                type: 'settlement',
            })
            .select('id')
            .single();

        if (entryError) throw entryError;
        balanceEntryId = entry.id;
    }

    const { error: settleError } = await supabase.from('debt_settlements').insert({
        debt_id: debtId,
        user_id: userData.user.id,
        balance_entry_id: balanceEntryId,
        amount,
        mode,
    });

    if (settleError) throw settleError;

    // Update debt status to settled
    const { error: updateError } = await supabase
        .from('debts')
        .update({ status: 'settled' })
        .eq('id', debtId);

    if (updateError) throw updateError;
}