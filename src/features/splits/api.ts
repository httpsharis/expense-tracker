import { calculateEvenSplit } from '@shared/lib/calculations';
import { supabase } from '@shared/lib/supabase';
import { Database } from '@shared/types/database.types';

export type Split = Database['public']['Tables']['splits']['Row'];

export interface CreateSplitPayload {
    transactionId: string;
    totalAmount: number;
    payerId: string | null;
    participantIds: (string | null)[];
}

export async function createSplit(payload: CreateSplitPayload): Promise<Split> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const numPeople = payload.participantIds.length;
    const splitResults = calculateEvenSplit(payload.totalAmount, numPeople, payload.payerId, payload.participantIds);

    const { data: split, error: splitError } = await supabase
        .from('splits')
        .insert({
            transaction_id: payload.transactionId,
            user_id: userData.user.id,
            total_amount: payload.totalAmount,
            payer_id: payload.payerId,
            num_people: numPeople,
        })
        .select('*')
        .single();

    if (splitError) throw splitError;

    // Create debt records for each non-payer participant
    for (const item of splitResults) {
        if (item.personId === payload.payerId) continue;

        if (payload.payerId === null && item.personId !== null) {
            // App user paid -> person owes app user
            await supabase.from('debts').insert({
                split_id: split.id,
                user_id: userData.user.id,
                person_id: item.personId,
                amount: item.amount,
                direction: 'owed_to_me',
                status: 'open',
            });
        } else if (payload.payerId !== null && item.personId === null) {
            // Person paid -> app user owes person
            await supabase.from('debts').insert({
                split_id: split.id,
                user_id: userData.user.id,
                person_id: payload.payerId,
                amount: item.amount,
                direction: 'i_owe',
                status: 'open',
            });
        }
    }

    return split;
}

export async function fetchSplitByTransaction(transactionId: string): Promise<Split | null> {
    const { data, error } = await supabase
        .from('splits')
        .select('*')
        .eq('transaction_id', transactionId)
        .maybeSingle();

    if (error) throw error;
    return data;
}
