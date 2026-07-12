import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  EMPTY_IDENTITY,
  type FamilyIdentity,
  getFamilyIdentity,
  isFamilyIdentityComplete,
  loadLatestFamilyProfile,
} from '@/lib/familyProfile';

export type Identity = FamilyIdentity;

export function useIdentity() {
  const { user, profile, passphrase } = useAuth();
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user || !passphrase || !profile?.encryption_salt) {
        setIdentity(EMPTY_IDENTITY);
        setLoading(false);
        return;
      }
      try {
        const latest = await loadLatestFamilyProfile(user.id, passphrase, profile.encryption_salt);
        if (!cancelled) setIdentity(getFamilyIdentity(latest?.data));
      } catch {
        if (!cancelled) setIdentity(EMPTY_IDENTITY);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [user, passphrase, profile]);

  const isComplete = isFamilyIdentityComplete(identity);

  const formalName = (() => {
    if (!identity.first_name) return '';
    const link = identity.gender === 'female' ? 'bint' : 'ibn';
    const father = identity.father_first_name ? ` ${link} ${identity.father_first_name}` : '';
    const last = identity.last_name ? ` ${identity.last_name}` : '';
    return `${identity.first_name}${father}${last}`;
  })();

  return { identity, loading, isComplete, formalName };
}
