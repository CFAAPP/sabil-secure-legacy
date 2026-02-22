import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TROY_OUNCE_TO_GRAMS = 31.1034768;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currency = 'USD' } = await req.json().catch(() => ({}));

    // Fetch metal prices (gold & silver in USD per troy ounce)
    let goldPriceUsdPerOz = 0;
    let silverPriceUsdPerOz = 0;
    let metalSource: 'api' | 'manual' = 'api';

    try {
      const metalRes = await fetch('https://api.metals.live/v1/spot');
      if (metalRes.ok) {
        const metalData = await metalRes.json();
        // metals.live returns array: [{gold: price}, {silver: price}, ...]
        for (const item of metalData) {
          if (item.gold) goldPriceUsdPerOz = item.gold;
          if (item.silver) silverPriceUsdPerOz = item.silver;
        }
      }
    } catch {
      // Fallback: try alternative
      try {
        const fallbackRes = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
        if (fallbackRes.ok) {
          const fb = await fallbackRes.json();
          if (fb.items?.[0]) {
            goldPriceUsdPerOz = fb.items[0].xauPrice || 0;
            silverPriceUsdPerOz = fb.items[0].xagPrice || 0;
          }
        }
      } catch {
        metalSource = 'manual';
      }
    }

    // Fetch FX rates from USD
    let fxRate = 1;
    let fxSource: 'api' | 'manual' = 'api';

    if (currency !== 'USD') {
      try {
        const fxRes = await fetch(`https://api.frankfurter.dev/latest?from=USD&to=${currency}`);
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          fxRate = fxData.rates?.[currency] || 1;
        } else {
          fxSource = 'manual';
        }
      } catch {
        fxSource = 'manual';
      }
    }

    // Convert to per-gram in selected currency
    const goldPerGram = goldPriceUsdPerOz > 0 
      ? (goldPriceUsdPerOz / TROY_OUNCE_TO_GRAMS) * fxRate 
      : 0;
    const silverPerGram = silverPriceUsdPerOz > 0 
      ? (silverPriceUsdPerOz / TROY_OUNCE_TO_GRAMS) * fxRate 
      : 0;

    // Nisab calculations
    const nisabGold = goldPerGram * 87.48;
    const nisabSilver = silverPerGram * 612.36;

    const result = {
      gold_price_per_gram: Math.round(goldPerGram * 100) / 100,
      silver_price_per_gram: Math.round(silverPerGram * 100) / 100,
      nisab_gold: Math.round(nisabGold * 100) / 100,
      nisab_silver: Math.round(nisabSilver * 100) / 100,
      fx_rate: fxRate,
      base_currency: 'USD',
      target_currency: currency,
      source: metalSource === 'manual' || fxSource === 'manual' ? 'manual' : 'api',
      updated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
