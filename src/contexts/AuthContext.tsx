import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Language } from '@/lib/i18n';
import { generateSalt } from '@/lib/crypto';

// Mettre à true pour désactiver temporairement la phrase secrète
const PASSPHRASE_PAUSED = true;

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  language: string;
  pin_hash: string | null;
  encryption_salt: string | null;
  pin_attempts: number;
  pin_locked_until: string | null;
  username?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  passphrase: string | null;
  setPassphrase: (p: string | null) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('fr');
  const [passphrase, setPassphrase] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) {
      // Si la phrase secrète est mise en pause, générer un salt par défaut si manquant
      if (PASSPHRASE_PAUSED && !data.encryption_salt) {
        const salt = generateSalt();
        await supabase.from('profiles').update({ encryption_salt: salt }).eq('user_id', userId);
        const { data: updated } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (updated) data = updated;
      }
      setProfile(data as Profile);
      const lang = (data as any).language;
      if (lang === 'fr' || lang === 'en' || lang === 'ar') setLanguage(lang);
      else setLanguage('fr');
      if (PASSPHRASE_PAUSED) {
        setPassphrase('mirath-paused-default');
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setPassphrase(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setPassphrase(null);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        language,
        setLanguage,
        passphrase,
        setPassphrase,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
