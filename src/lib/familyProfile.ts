import { supabase } from '@/integrations/supabase/client';
import { encrypt, decrypt } from '@/lib/crypto';

export interface FamilyProfileData {
  personal_info: {
    full_name: string;
    first_name: string;
    last_name: string;
    gender: 'male' | 'female' | '';
    birth_date: string;
    country: string;
    marital_status: 'single' | 'married' | 'divorced' | 'widowed' | '';
  };
  spouse: {
    enabled: boolean;
    name: string;
    active_marriage: boolean;
  };
  children: {
    count: number;
    items: Array<{ id: string; name: string; gender: 'male' | 'female'; alive: boolean }>;
  };
  parents: {
    father_alive: boolean;
    father_name: string;
    father_first_name: string;
    mother_alive: boolean;
    mother_name: string;
  };
  siblings: {
    brothers_count: number;
    sisters_count: number;
    brothers: Array<{ id: string; name: string; alive: boolean }>;
    sisters: Array<{ id: string; name: string; alive: boolean }>;
  };
  custom_people: Array<{ id: string; label: string; name: string; notes: string; tag: 'info' | 'potential_heir' | 'potential_wakil' }>;
}

export interface FamilyIdentity {
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | '';
  birth_date: string;
  father_first_name: string;
}

export const EMPTY_FAMILY_PROFILE: FamilyProfileData = {
  personal_info: { full_name: '', first_name: '', last_name: '', gender: '', birth_date: '', country: '', marital_status: '' },
  spouse: { enabled: false, name: '', active_marriage: true },
  children: { count: 0, items: [] },
  parents: { father_alive: false, father_name: '', father_first_name: '', mother_alive: false, mother_name: '' },
  siblings: { brothers_count: 0, sisters_count: 0, brothers: [], sisters: [] },
  custom_people: [],
};

export const EMPTY_IDENTITY: FamilyIdentity = {
  first_name: '',
  last_name: '',
  gender: '',
  birth_date: '',
  father_first_name: '',
};

export function getFamilyIdentity(data: Partial<FamilyProfileData> | null | undefined): FamilyIdentity {
  return {
    first_name: data?.personal_info?.first_name || '',
    last_name: data?.personal_info?.last_name || '',
    gender: data?.personal_info?.gender || '',
    birth_date: data?.personal_info?.birth_date || '',
    father_first_name: data?.parents?.father_first_name || '',
  };
}

export function isFamilyIdentityComplete(identity: FamilyIdentity) {
  return Boolean(
    identity.first_name.trim() &&
    identity.last_name.trim() &&
    identity.birth_date.trim() &&
    identity.father_first_name.trim() &&
    identity.gender
  );
}

export async function loadLatestFamilyProfile(userId: string, passphrase: string, salt: string) {
  const { data: row, error } = await supabase
    .from('vault_items')
    .select('*')
    .eq('user_id', userId)
    .eq('item_type', 'family_profile')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const json = await decrypt(
    (row as any).content_encrypted,
    (row as any).iv,
    passphrase,
    salt
  );

  return { id: row.id, data: JSON.parse(json) as FamilyProfileData };
}

export async function saveFamilyProfile(params: {
  userId: string;
  passphrase: string;
  salt: string;
  data: FamilyProfileData;
  existingId?: string | null;
}) {
  const json = JSON.stringify(params.data);
  const { ciphertext, iv } = await encrypt(json, params.passphrase, params.salt);
  const row: any = {
    user_id: params.userId,
    item_type: 'family_profile',
    title_encrypted: ciphertext.slice(0, 50),
    content_encrypted: ciphertext,
    iv,
  };

  let targetId = params.existingId || null;
  if (!targetId) {
    const { data: latest, error } = await supabase
      .from('vault_items')
      .select('id')
      .eq('user_id', params.userId)
      .eq('item_type', 'family_profile')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    targetId = (latest as any)?.id || null;
  }

  if (targetId) {
    const { data: updated, error } = await supabase
      .from('vault_items')
      .update(row)
      .eq('id', targetId)
      .eq('user_id', params.userId)
      .select('id')
      .single();
    if (error) throw error;
    return updated.id;
  }

  const { data: inserted, error } = await supabase
    .from('vault_items')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return inserted.id;
}