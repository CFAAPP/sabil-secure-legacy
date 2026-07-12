import { supabase } from '@/integrations/supabase/client';

export interface Contact {
  id: string;
  contact_user_id: string;
  contact_username: string;
  label: string | null;
  created_at: string;
}

export async function listContacts(ownerUserId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, contact_user_id, contact_username, label, created_at')
    .eq('owner_user_id', ownerUserId)
    .order('contact_username', { ascending: true });
  if (error) throw error;
  return (data as Contact[]) || [];
}

export async function addContactByUsername(
  ownerUserId: string,
  rawUsername: string,
  label?: string,
): Promise<{ ok: true; contact: Contact } | { ok: false; reason: 'invalid' | 'not_found' | 'self' | 'exists' | 'error' }> {
  const username = rawUsername.trim().replace(/^@+/, '').toLowerCase();
  if (!/^[a-z0-9_.]{3,30}$/.test(username)) return { ok: false, reason: 'invalid' };

  const { data: uid } = await supabase.rpc('lookup_user_by_username', { _username: username });
  const contactUserId = (uid as string | null) ?? null;
  if (!contactUserId) return { ok: false, reason: 'not_found' };
  if (contactUserId === ownerUserId) return { ok: false, reason: 'self' };

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      owner_user_id: ownerUserId,
      contact_user_id: contactUserId,
      contact_username: username,
      label: label?.trim() || null,
    })
    .select('id, contact_user_id, contact_username, label, created_at')
    .single();

  if (error) {
    if ((error as any).code === '23505') return { ok: false, reason: 'exists' };
    return { ok: false, reason: 'error' };
  }
  return { ok: true, contact: data as Contact };
}

export async function updateContactLabel(id: string, label: string | null): Promise<void> {
  await supabase.from('contacts').update({ label: label?.trim() || null }).eq('id', id);
}

export async function deleteContact(id: string): Promise<void> {
  await supabase.from('contacts').delete().eq('id', id);
}
