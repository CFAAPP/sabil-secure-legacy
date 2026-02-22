import type { Language } from '@/lib/i18n';
import type { ZakatInputs, ZakatRates, ZakatSettings } from '@/hooks/useZakatData';
import type { ZakatCalcResult } from '@/lib/zakatCalc';
import { formatMoney, getCurrencySymbol } from '@/lib/zakatCalc';
import { zt } from '@/lib/zakatI18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Banknote, Gem, Briefcase, TrendingUp, Minus, Download, Save, Loader2, Info } from 'lucide-react';

interface Props {
  inputs: ZakatInputs;
  rates: ZakatRates;
  settings: ZakatSettings;
  calc: ZakatCalcResult;
  language: Language;
  saving: boolean;
  onInputsChange: (inputs: ZakatInputs) => void;
  onImportDebts: () => void;
  onSave: () => void;
}

export default function ZakatSimulator({ inputs, rates, settings, calc, language, saving, onInputsChange, onImportDebts, onSave }: Props) {
  const z = (key: Parameters<typeof zt>[0]) => zt(key, language);
  const cur = settings.currency;
  const sym = getCurrencySymbol(cur);

  const update = (field: keyof ZakatInputs, value: string) => {
    const num = parseFloat(value) || 0;
    onInputsChange({ ...inputs, [field]: num });
  };

  const goldValue = inputs.gold_grams * rates.gold_price_per_gram;
  const silverValue = inputs.silver_grams * rates.silver_price_per_gram;

  return (
    <div className="space-y-4">
      {/* Money & Accounts */}
      <SimSection icon={<Banknote className="h-4 w-4 text-primary" />} title={z('moneyAccounts')}>
        <SimField label={z('cashOnHand')} info={z('infoCash')} value={inputs.cash} onChange={v => update('cash', v)} suffix={sym} />
        <SimField label={z('currentAccount')} info={z('infoBank')} value={inputs.bank_current} onChange={v => update('bank_current', v)} suffix={sym} />
        <SimField label={z('savingsAccount')} info={z('infoSavings')} value={inputs.savings} onChange={v => update('savings', v)} suffix={sym} />
        <SimField label={z('otherLiquid')} value={inputs.other_liquid} onChange={v => update('other_liquid', v)} suffix={sym} />
      </SimSection>

      {/* Gold & Silver */}
      <SimSection icon={<Gem className="h-4 w-4 text-gold" />} title={z('goldSilver')}>
        <SimField label={z('goldGrams')} info={z('infoGold')} value={inputs.gold_grams} onChange={v => update('gold_grams', v)} suffix="g" />
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{z('pricePerGram')}: {rates.gold_price_per_gram.toFixed(2)} {sym}/g</span>
          <span>{z('calculatedValue')}: {formatMoney(goldValue, cur)}</span>
        </div>
        <SimField label={z('silverGrams')} info={z('infoSilver')} value={inputs.silver_grams} onChange={v => update('silver_grams', v)} suffix="g" />
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{z('pricePerGram')}: {rates.silver_price_per_gram.toFixed(2)} {sym}/g</span>
          <span>{z('calculatedValue')}: {formatMoney(silverValue, cur)}</span>
        </div>
      </SimSection>

      {/* Business */}
      <SimSection icon={<Briefcase className="h-4 w-4 text-primary" />} title={z('business')}>
        <SimField label={z('stockValue')} info={z('infoBusiness')} value={inputs.business_stock_value} onChange={v => update('business_stock_value', v)} suffix={sym} />
        <SimField label={z('receivables')} info={z('infoReceivables')} value={inputs.receivables} onChange={v => update('receivables', v)} suffix={sym} />
      </SimSection>

      {/* Investments */}
      <SimSection icon={<TrendingUp className="h-4 w-4 text-primary" />} title={z('investmentsSection')}>
        <SimField label={z('stocksEtf')} info={z('infoInvestments')} value={inputs.investments} onChange={v => update('investments', v)} suffix={sym} />
        <SimField label={z('cryptoAssets')} info={z('infoCrypto')} value={inputs.crypto} onChange={v => update('crypto', v)} suffix={sym} />
      </SimSection>

      {/* Debts */}
      <SimSection icon={<Minus className="h-4 w-4 text-destructive" />} title={z('debtsSection')}>
        <SimField label={z('totalDebts')} info={z('infoDebts')} value={inputs.debts_deductible} onChange={v => update('debts_deductible', v)} suffix={sym} />
        <Button variant="outline" size="sm" onClick={onImportDebts} className="w-full text-xs gap-1.5 border-border hover:border-gold/30 hover:text-gold">
          <Download className="h-3.5 w-3.5" /> {z('importFromDebts')}
        </Button>
      </SimSection>

      {/* Sticky Summary */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border p-4 md:static md:border md:rounded-xl md:bg-card md:backdrop-blur-none">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{z('netZakatable')}:</span>
                <span className="font-semibold">{formatMoney(calc.netZakatable, cur)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{z('nisab')}:</span>
                <span>{formatMoney(calc.nisab, cur)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{z('zakatDue')}:</span>
                <span className="font-bold text-gold">{formatMoney(calc.zakatDue, cur)}</span>
              </div>
            </div>
            <Button onClick={onSave} disabled={saving} className="bg-gold hover:bg-gold-dim text-primary-foreground gap-1.5 h-10">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {z('saveData')}
            </Button>
          </div>
          {calc.isAboveNisab && (
            <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">✓ {z('zakatIsDue')}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function SimSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {children}
      </CardContent>
    </Card>
  );
}

function SimField({ label, info, value, onChange, suffix }: { label: string; info?: string; value: number; onChange: (v: string) => void; suffix: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs">{info}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        <Input
          type="number"
          step="any"
          min="0"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          className="pr-12 h-9 text-sm bg-background"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}
