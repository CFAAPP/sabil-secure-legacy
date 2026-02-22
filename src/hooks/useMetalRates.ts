import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedRates, setCachedRates, type ZakatRates } from './useZakatData';

export interface MetalRatesResult {
  gold_price_per_gram: number;
  silver_price_per_gram: number;
  nisab_gold: number;
  nisab_silver: number;
  fx_rate: number;
  source: 'api' | 'manual';
  updated_at: string;
}

export function useMetalRates() {
  const [fetching, setFetching] = useState(false);

  const fetchRates = useCallback(async (currency: string): Promise<MetalRatesResult | null> => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-metal-rates', {
        body: { currency },
      });

      if (error || !data || data.error) {
        // Try cached
        const cached = getCachedRates();
        if (cached && cached.gold_price_per_gram > 0) {
          setFetching(false);
          return {
            gold_price_per_gram: cached.gold_price_per_gram,
            silver_price_per_gram: cached.silver_price_per_gram,
            nisab_gold: cached.gold_price_per_gram * 87.48,
            nisab_silver: cached.silver_price_per_gram * 612.36,
            fx_rate: cached.fx_to_selected,
            source: 'manual',
            updated_at: cached.updated_at,
          };
        }
        setFetching(false);
        return null;
      }

      // Cache the rates
      const rates: ZakatRates = {
        updated_at: data.updated_at,
        base_currency: 'USD',
        fx_to_selected: data.fx_rate,
        gold_price_per_gram: data.gold_price_per_gram,
        silver_price_per_gram: data.silver_price_per_gram,
        source: data.source,
      };
      setCachedRates(rates);

      setFetching(false);
      return data as MetalRatesResult;
    } catch {
      setFetching(false);
      const cached = getCachedRates();
      if (cached && cached.gold_price_per_gram > 0) {
        return {
          gold_price_per_gram: cached.gold_price_per_gram,
          silver_price_per_gram: cached.silver_price_per_gram,
          nisab_gold: cached.gold_price_per_gram * 87.48,
          nisab_silver: cached.silver_price_per_gram * 612.36,
          fx_rate: cached.fx_to_selected,
          source: 'manual',
          updated_at: cached.updated_at,
        };
      }
      return null;
    }
  }, []);

  return { fetchRates, fetching };
}
