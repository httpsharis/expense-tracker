import { supabase } from '@shared/lib/supabase';
import { Database } from '@shared/types/database.types';

export type Period = Database['public']['Tables']['periods']['Row'];

export async function fetchActivePeriod(): Promise<Period | null> {
    const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('status', 'open')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function fetchPeriods(): Promise<Period[]> {
    const { data, error } = await supabase
        .from('periods')
        .select('*')
        .order('started_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function createPeriod(name: string): Promise<Period> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('periods')
        .insert({
            user_id: userData.user.id,
            name,
            status: 'open',
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function closePeriod(periodId: string): Promise<void> {
    const { error } = await supabase
        .from('periods')
        .update({
            status: 'closed',
            ended_at: new Date().toISOString(),
        })
        .eq('id', periodId);

    if (error) throw error;
}