import { supabase } from '@shared/lib/supabase';
import { Database } from '@shared/types/database.types';

export type Transaction = Database['public']['Tables']['transactions']['Row'];

export interface CreateTransactionPayload {
    periodId: string;
    category: string;
    amount: number;
    notes?: string;
    isGroup?: boolean;
    payerId?: string | null; // null means app user paid
    participantIds?: (string | null)[];
}

export async function fetchTransactions(periodId?: string): Promise<Transaction[]> {
    if (!periodId) return [];
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('period_id', periodId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function fetchTransactionById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            period_id: payload.periodId,
            user_id: userData.user.id,
            category: payload.category,
            amount: payload.amount,
            notes: payload.notes || null,
            is_group: payload.isGroup || false,
        })
        .select('*')
        .single();

    if (txnError) throw txnError;

    // Record balance entry for solo expense or group expense where app user paid
    if (!payload.isGroup || payload.payerId === null) {
        await supabase.from('balance_entries').insert({
            period_id: payload.periodId,
            user_id: userData.user.id,
            amount: payload.amount,
            type: 'expense',
        });
    }

    return txn;
}

export async function deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
}
