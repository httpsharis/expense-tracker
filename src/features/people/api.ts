import { supabase } from '@shared/lib/supabase';
import { Database } from '@shared/types/database.types';

export type Person = Database['public']['Tables']['people']['Row'];

export async function fetchPeople(): Promise<Person[]> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return [];

    const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function addPerson(name: string): Promise<Person> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('people')
        .insert({
            user_id: userData.user.id,
            name,
        })
        .select('*')
        .single();

    if (error) throw error;
    return data;
}

export async function deletePerson(id: string): Promise<void> {
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) throw error;
}
