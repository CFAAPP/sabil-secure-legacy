import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useZakatData, type ZakatData, type ZakatInputs } from '@/hooks/useZakatData';
import { useMetalRates } from '@/hooks/useMetalRates';
import { calculateZakat } from '@/lib/zakatCalc';
import { zt } from '@/lib/zakatI18n';
import { decrypt } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import ZakatDashboard from '@/components/zakat/ZakatDashboard';
import ZakatSimulator from '@/components/zakat/ZakatSimulator';
import ZakatHistory from '@/components/zakat/ZakatHistory';
import ZakatSettingsPanel from '@/components/zakat/ZakatSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calculator, Clock, Settings, Loader2 } from 'lucide-react';

export default function Zakat() {
  const { user, profile, passphrase, language } = useAuth();
  const { toast } = useToast();
  const { data, setData, loading, saving, save } = useZakatData();
  const { fetchRates, fetching: ratesFetching } = useMetalRates();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ratesLoaded, setRatesLoaded] = useState(false);

  const z = useCallback((key: Parameters<typeof zt>[0]) => zt(key, language), [language]);

  // Fetch rates on mount and currency change
  const loadRates = useCallback(async () => {
    const result = await fetchRates(data.settings.currency);
    if (result) {
      setData(prev => ({
        ...prev,
        rates: {
          updated_at: result.updated_at,
          base_currency: 'USD',
          fx_to_selected: result.fx_rate,
          gold_price_per_gram: result.gold_price_per_gram,
          silver_price_per_gram: result.silver_price_per_gram,
          source: result.source as 'api' | 'manual',
        },
      }));
      setRatesLoaded(true);
    }
  }, [data.settings.currency, fetchRates, setData]);

  useEffect(() => {
    if (!loading) loadRates();
  }, [loading, data.settings.currency]);

  // Calculate zakat
  const calc = useMemo(() => calculateZakat(
    data.inputs,
    data.rates.gold_price_per_gram,
    data.rates.silver_price_per_gram,
    data.settings.nisab_method
  ), [data.inputs, data.rates, data.settings.nisab_method]);

  const handleInputsChange = (inputs: ZakatInputs) => {
    setData(prev => ({ ...prev, inputs }));
  };

  const handleSettingsChange = (settings: ZakatData['settings']) => {
    setData(prev => ({ ...prev, settings }));
  };

  const handleSave = async () => {
    try {
      await save(data);
      toast({ title: z('saved') });
    } catch {
      toast({ title: z('error'), variant: 'destructive' });
    }
  };

  // Import debts from debt module
  const importDebts = useCallback(async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return 0;
    try {
      const { data: debts } = await supabase
        .from('debts')
        .select('amount_encrypted, iv, debt_type, status')
        .eq('user_id', user.id)
        .eq('debt_type', 'i_owe')
        .neq('status', 'paid');

      if (!debts?.length) return 0;

      let total = 0;
      for (const d of debts) {
        try {
          const amt = await decrypt(d.amount_encrypted, d.iv, passphrase, profile.encryption_salt!);
          total += parseFloat(amt) || 0;
        } catch { /* skip */ }
      }
      return total;
    } catch { return 0; }
  }, [user, passphrase, profile]);

  const handleImportDebts = async () => {
    const total = await importDebts();
    setData(prev => ({
      ...prev,
      inputs: { ...prev.inputs, debts_deductible: total },
    }));
    toast({ title: z('importedDebts'), description: `${total.toLocaleString()} ${data.settings.currency}` });
  };

  const handleMarkPaid = (yearKey: string) => {
    setData(prev => ({
      ...prev,
      history: prev.history.map(h =>
        h.year_key === yearKey ? { ...h, paid: true, payment_date: new Date().toISOString().split('T')[0] } : h
      ),
    }));
  };

  const handleSaveToHistory = () => {
    const yearKey = new Date().getFullYear().toString();
    const existing = data.history.findIndex(h => h.year_key === yearKey);
    const entry = {
      year_key: yearKey,
      net_zakatable: calc.netZakatable,
      nisab_used: calc.nisab,
      method: data.settings.nisab_method,
      zakat_due: calc.zakatDue,
      paid: false,
      payment_date: null,
    };
    setData(prev => {
      const history = [...prev.history];
      if (existing >= 0) {
        history[existing] = entry;
      } else {
        history.push(entry);
      }
      return { ...prev, history };
    });
  };

  const handleDuplicatePrevious = () => {
    if (!data.history.length) return;
    const last = data.history[data.history.length - 1];
    const nextYear = (parseInt(last.year_key) + 1).toString();
    setData(prev => ({
      ...prev,
      history: [...prev.history, { ...last, year_key: nextYear, paid: false, payment_date: null }],
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in pb-28">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 px-5 pt-4 pb-3"
          style={{ background: 'linear-gradient(135deg, hsl(155 28% 26%) 0%, hsl(155 22% 22%) 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold/10 border border-gold/20">
              <BarChart3 className="h-4 w-4 text-gold" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-gold-gradient">{z('zakatTitle')}</h1>
              <p className="text-xs text-primary-foreground/60">{z('zakatSubtitle')}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full bg-card border border-border">
            <TabsTrigger value="dashboard" className="text-xs gap-1 data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{z('dashboard')}</span>
            </TabsTrigger>
            <TabsTrigger value="simulator" className="text-xs gap-1 data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
              <Calculator className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{z('simulator')}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1 data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{z('history')}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1 data-[state=active]:bg-gold/10 data-[state=active]:text-gold">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{z('settings')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <ZakatDashboard
              calc={calc}
              data={data}
              language={language}
              ratesFetching={ratesFetching}
              onRefreshRates={loadRates}
              onGoToSimulator={() => setActiveTab('simulator')}
              onGoToHistory={() => setActiveTab('history')}
              onMarkPaid={() => {
                handleSaveToHistory();
                const yearKey = new Date().getFullYear().toString();
                handleMarkPaid(yearKey);
              }}
              onManualRateChange={(gold, silver) => {
                setData(prev => ({
                  ...prev,
                  rates: {
                    ...prev.rates,
                    gold_price_per_gram: gold,
                    silver_price_per_gram: silver,
                    source: 'manual',
                    updated_at: new Date().toISOString(),
                  },
                }));
              }}
              onClearManualRates={() => {
                loadRates();
              }}
            />
          </TabsContent>

          <TabsContent value="simulator" className="mt-4">
            <ZakatSimulator
              inputs={data.inputs}
              rates={data.rates}
              settings={data.settings}
              calc={calc}
              language={language}
              saving={saving}
              onInputsChange={handleInputsChange}
              onImportDebts={handleImportDebts}
              onSave={handleSave}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ZakatHistory
              history={data.history}
              currency={data.settings.currency}
              language={language}
              onMarkPaid={handleMarkPaid}
              onDuplicatePrevious={handleDuplicatePrevious}
              onSave={handleSave}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <ZakatSettingsPanel
              settings={data.settings}
              language={language}
              onSettingsChange={handleSettingsChange}
              onSave={handleSave}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
