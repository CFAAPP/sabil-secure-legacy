import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { decrypt } from '@/lib/crypto';

export interface Identity {
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | '';
  birth_date: string;
  father_first_name: string;
}

const EMPTY: Identity = { first_name: '', last_name: '', gender: '', birth_date: '', father_first_name: '' };

export function useIdentity() {
  const { user, profile, passphrase } = useAuth();
  const [identity, setIdentity] = useState<Identity>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user || !passphrase || !profile?.encryption_salt) {
        setLoading(false);
        return;
      }
      const { data: row } = await supabase
        .from('vault_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_type', 'family_profile')
        .maybeSingle();
      if (cancelled) return;
      if (row) {
        try {
          const json = await decrypt(
            (row as any).content_encrypted,
            (row as any).iv,
            passphrase,
            profile.encryption_salt
          );
          const fam = JSON.parse(json);
          if (!cancelled) {
            setIdentity({
              first_name: fam?.personal_info?.first_name || '',
              last_name: fam?.personal_info?.last_name || '',
              gender: fam?.personal_info?.gender || '',
              birth_date: fam?.personal_info?.birth_date || '',
              father_first_name: fam?.parents?.father_first_name || '',
            });
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [user, passphrase, profile]);

  const isComplete =
    !!identity.first_name && !!identity.last_name && !!identity.birth_date &&
    !!identity.father_first_name && !!identity.gender;

  const formalName = (() => {
    if (!identity.first_name) return '';
    const link = identity.gender === 'female' ? 'bint' : 'ibn';
    const father = identity.father_first_name ? ` ${link} ${identity.father_first_name}` : '';
    const last = identity.last_name ? ` ${identity.last_name}` : '';
    return `${identity.first_name}${father}${last}`;
  })();

  return { identity, loading, isComplete, formalName };
}
