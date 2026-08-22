import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { encrypt, decrypt, generateIv } from '@/lib/crypto';

export interface ZakatInputs {
  cash: number;
  bank_current: number;
  savings: number;
  other_liquid: number;
  gold_grams: number;
  silver_grams: number;
  business_stock_value: number;
  receivables: number;
  investments: number;
  crypto: number;
  debts_deductible: number;
}

export interface ZakatRates {
  updated_at: string;
  base_currency: string;
  fx_to_selected: number;
  gold_price_per_gram: number;
  silver_price_per_gram: number;
  source: 'api' | 'manual';
}

export interface ZakatHistoryEntry {
  year_key: string;
  net_zakatable: number;
  nisab_used: number;
  method: 'gold' | 'silver';
  zakat_due: number;
  paid: boolean;
  payment_date: string | null;
}

export interface ZakatSettings {
  currency: string;
  nisab_method: 'gold' | 'silver';
  annual_date: string | null;
  calendar_type: 'gregorian' | 'hijri';
  reminders: { enabled: boolean; d30: boolean; d7: boolean };
}

export interface ZakatData {
  settings: ZakatSettings;
  inputs: ZakatInputs;
  rates: ZakatRates;
  history: ZakatHistoryEntry[];
}

const DEFAULT_INPUTS: ZakatInputs = {
  cash: 0, bank_current: 0, savings: 0, other_liquid: 0,
  gold_grams: 0, silver_grams: 0,
  business_stock_value: 0, receivables: 0,
  investments: 0, crypto: 0, debts_deductible: 0,
};

const DEFAULT_SETTINGS: ZakatSettings = {
  currency: 'EUR',
  nisab_method: 'silver',
  annual_date: null,
  calendar_type: 'hijri',
  reminders: { enabled: true, d30: true, d7: true },
};

const DEFAULT_RATES: ZakatRates = {
  updated_at: '', base_currency: 'USD', fx_to_selected: 1,
  gold_price_per_gram: 0, silver_price_per_gram: 0, source: 'manual',
};

export const DEFAULT_ZAKAT_DATA: ZakatData = {
  settings: DEFAULT_SETTINGS,
  inputs: DEFAULT_INPUTS,
  rates: DEFAULT_RATES,
  history: [],
};

const CACHE_KEY = 'mirath_zakat_rates';

export function getCachedRates(): ZakatRates | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }
  return null;
}

export function setCachedRates(rates: ZakatRates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
  } catch { /* ignore */ }
}

export function useZakatData() {
  const { user, passphrase, profile } = useAuth();
  const [data, setData] = useState<ZakatData>(DEFAULT_ZAKAT_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setLoading(true);
    try {
      const { data: vault } = await supabase
        .from('vault_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_type', 'zakat_data')
        .maybeSingle();

      if (vault) {
        const json = await decrypt(vault.content_encrypted, vault.iv, passphrase, profile.encryption_salt!);
        const parsed = JSON.parse(json);
        setData({ ...DEFAULT_ZAKAT_DATA, ...parsed });
      }
    } catch { /* use defaults */ }
    setLoading(false);
  }, [user, passphrase, profile]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (newData: ZakatData) => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setSaving(true);
    try {
      const json = JSON.stringify(newData);
      const iv = generateIv();
      const { ciphertext } = await encrypt(json, passphrase, profile.encryption_salt!, iv);
      const { ciphertext: titleEnc } = await encrypt('zakat_data', passphrase, profile.encryption_salt!, iv);

      const { data: existing } = await supabase
        .from('vault_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_type', 'zakat_data')
        .maybeSingle();

      const row = {
        user_id: user.id,
        item_type: 'zakat_data',
        title_encrypted: titleEnc,
        content_encrypted: ciphertext,
        iv,
      };

      if (existing) {
        await supabase.from('vault_items').update(row as any).eq('id', existing.id);
      } else {
        await supabase.from('vault_items').insert(row as any);
      }

      setData(newData);
    } catch (e) {
      console.error('Failed to save zakat data:', e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [user, passphrase, profile]);

  return { data, setData, loading, saving, save, reload: load };
}
