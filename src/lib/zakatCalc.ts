import type { ZakatInputs } from '@/hooks/useZakatData';

export interface ZakatCalcResult {
  totalAssets: number;
  totalDebts: number;
  netZakatable: number;
  nisabGold: number;
  nisabSilver: number;
  nisab: number;
  zakatDue: number;
  nisabPercent: number;
  isAboveNisab: boolean;
  breakdown: {
    cashBank: number;
    goldSilver: number;
    business: number;
    investments: number;
    crypto: number;
  };
}

export function calculateZakat(
  inputs: ZakatInputs,
  goldPricePerGram: number,
  silverPricePerGram: number,
  nisabMethod: 'gold' | 'silver'
): ZakatCalcResult {
  const goldValue = inputs.gold_grams * goldPricePerGram;
  const silverValue = inputs.silver_grams * silverPricePerGram;

  const cashBank = inputs.cash + inputs.bank_current + inputs.savings + inputs.other_liquid;
  const goldSilver = goldValue + silverValue;
  const business = inputs.business_stock_value + inputs.receivables;
  const investments = inputs.investments;
  const crypto = inputs.crypto;

  const totalAssets = cashBank + goldSilver + business + investments + crypto;
  const totalDebts = inputs.debts_deductible;
  const netZakatable = Math.max(0, totalAssets - totalDebts);

  const nisabGold = goldPricePerGram * 87.48;
  const nisabSilver = silverPricePerGram * 612.36;
  const nisab = nisabMethod === 'gold' ? nisabGold : nisabSilver;

  const isAboveNisab = nisab > 0 && netZakatable >= nisab;
  const zakatDue = isAboveNisab ? netZakatable * 0.025 : 0;
  const nisabPercent = nisab > 0 ? Math.min((netZakatable / nisab) * 100, 200) : 0;

  return {
    totalAssets,
    totalDebts,
    netZakatable,
    nisabGold,
    nisabSilver,
    nisab,
    zakatDue,
    nisabPercent,
    isAboveNisab,
    breakdown: { cashBank, goldSilver, business, investments, crypto },
  };
}

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'MAD', symbol: 'MAD', label: 'Dirham marocain' },
  { code: 'TND', symbol: 'TND', label: 'Dinar tunisien' },
  { code: 'DZD', symbol: 'DZD', label: 'Dinar algérien' },
  { code: 'SAR', symbol: 'SAR', label: 'Riyal saoudien' },
  { code: 'AED', symbol: 'AED', label: 'Dirham émirati' },
  { code: 'QAR', symbol: 'QAR', label: 'Riyal qatari' },
  { code: 'KWD', symbol: 'KWD', label: 'Dinar koweïtien' },
  { code: 'TRY', symbol: '₺', label: 'Lire turque' },
  { code: 'EGP', symbol: 'EGP', label: 'Livre égyptienne' },
  { code: 'CHF', symbol: 'CHF', label: 'Franc suisse' },
  { code: 'CAD', symbol: 'CAD', label: 'Dollar canadien' },
];

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol || code;
}

export function formatMoney(value: number, currency: string): string {
  const sym = getCurrencySymbol(currency);
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}
