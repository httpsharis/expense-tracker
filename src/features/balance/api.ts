import { supabase } from '@shared/lib/supabase';
import { Database } from '@shared/types/database.types';

type BalanceEntry = Database['public']['Tables']['balance_entries']['Row'];

export async function fetchBalanceEntries(periodId: string): Promise<BalanceEntry[]> {
    const { data, error } = await supabase
        .from('balance_entries')
        .select('*')
        .eq('period_id', periodId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function addTopUp(periodId: string, amount: number): Promise<void> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const { error } = await supabase.from('balance_entries').insert({
        period_id: periodId,
        user_id: userData.user.id,
        amount,
        type: 'top_up',
    });

    if (error) throw error;
}