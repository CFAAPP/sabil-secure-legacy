import { useMemo } from 'react';
import { useState } from 'react';
import type { Language } from '@/lib/i18n';
import type { ZakatCalcResult } from '@/lib/zakatCalc';
import type { ZakatData } from '@/hooks/useZakatData';
import { formatMoney, getCurrencySymbol } from '@/lib/zakatCalc';
import { zt } from '@/lib/zakatI18n';
import { parseStoredDate, hijriToGregorian, formatHijriDisplay } from '@/lib/hijri';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { RefreshCw, Calculator, Clock, CheckCircle2, TrendingUp, Wallet, Coins, Loader2, Info, ExternalLink, Edit3, Trash2, CalendarClock, Settings } from 'lucide-react';

interface Props {
  calc: ZakatCalcResult;
  data: ZakatData;
  language: Language;
  ratesFetching: boolean;
  onRefreshRates: () => void;
  onGoToSimulator: () => void;
  onGoToHistory: () => void;
  onMarkPaid: () => void;
  onManualRateChange: (gold: number, silver: number) => void;
  onClearManualRates: () => void;
  onGoToSettings: () => void;
}

const CHART_COLORS = [
  'hsl(150 5% 35%)', // grey
  'hsl(42 62% 62%)',  // or
  'hsl(200 50% 45%)', // blue
  'hsl(280 40% 50%)', // purple
  'hsl(340 50% 50%)', // pink
];

export default function ZakatDashboard({ calc, data, language, ratesFetching, onRefreshRates, onGoToSimulator, onGoToHistory, onMarkPaid, onManualRateChange, onClearManualRates, onGoToSettings }: Props) {
  const z = (key: Parameters<typeof zt>[0]) => zt(key, language);
  const cur = data.settings.currency;
  const sym = getCurrencySymbol(cur);
  const isGold = data.settings.nisab_method === 'gold';
  const themeColor = isGold ? 'gold' : 'silver';
  const themeLabel = isGold ? z('goldPrice') : z('silverPrice');
  const [editingRates, setEditingRates] = useState(false);
  const [manualGold, setManualGold] = useState(data.rates.gold_price_per_gram.toString());
  const [manualSilver, setManualSilver] = useState(data.rates.silver_price_per_gram.toString());

  // Rates info bar
  const rateDate = data.rates.updated_at
    ? new Date(data.rates.updated_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : 'en-US')
    : '—';

  // Donut data
  const donutData = useMemo(() => {
    const items = [
      { name: z('cashBank'), value: calc.breakdown.cashBank },
      { name: z('goldSilverShort'), value: calc.breakdown.goldSilver },
      { name: z('businessShort'), value: calc.breakdown.business },
      { name: z('investmentsShort'), value: calc.breakdown.investments },
      { name: z('cryptoShort'), value: calc.breakdown.crypto },
    ].filter(i => i.value > 0);
    return items;
  }, [calc.breakdown, language]);

  // History chart data
  const historyData = useMemo(() =>
    data.history.map(h => ({
      year: h.year_key,
      zakat: h.zakat_due,
    })), [data.history]);

  const progressValue = Math.min(calc.nisabPercent, 100);

  // Calculate days remaining until zakat date
  const daysInfo = useMemo(() => {
    if (!data.settings.annual_date) return null;
    const parsed = parseStoredDate(data.settings.annual_date);
    let targetDate: Date;
    let displayLabel: string;

    if (parsed.type === 'hijri' && parsed.hijri) {
      targetDate = hijriToGregorian(parsed.hijri);
      displayLabel = formatHijriDisplay(parsed.hijri, language);
    } else if (parsed.gregorianStr) {
      // Build this year's date from month/day
      const parts = parsed.gregorianStr.split('-');
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      targetDate = new Date(new Date().getFullYear(), month, day);
      // If already passed this year, use next year
      if (targetDate < new Date()) {
        targetDate = new Date(new Date().getFullYear() + 1, month, day);
      }
      displayLabel = targetDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      return null;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffMs = targetDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / 86400000);
    const totalDays = 365; // approximate cycle
    const elapsed = Math.max(0, totalDays - daysLeft);
    const percent = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));

    return { daysLeft, displayLabel, percent };
  }, [data.settings.annual_date, language]);

  return (
    <div className="space-y-4">
      {/* Rates bar */}
      <Card className="border-border">
        <CardContent className="pt-3 pb-3 px-4 space-y-3">
          {/* Rate display row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
                <Coins className="h-3 w-3" />
                {data.rates.source === 'api' ? z('apiMode') : z('manualMode')}
              </Badge>
              {data.rates.updated_at && (
                <span className="text-[10px] text-muted-foreground/60">
                  ({rateDate})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {data.rates.source === 'manual' && (
                <Button variant="ghost" size="sm" onClick={onClearManualRates} className="h-7 text-xs text-destructive/70 hover:text-destructive" title={language === 'fr' ? 'Supprimer les taux manuels' : 'Clear manual rates'}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setManualGold(data.rates.gold_price_per_gram.toString()); setManualSilver(data.rates.silver_price_per_gram.toString()); setEditingRates(!editingRates); }} className="h-7 text-xs text-muted-foreground hover:text-primary">
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onRefreshRates} disabled={ratesFetching} className="h-7 text-xs text-muted-foreground hover:text-primary">
                {ratesFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          {/* Gold & Silver values displayed below */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-gold" />
              <span className="text-muted-foreground">{z('goldPrice')}:</span>
              <span className="font-medium">{data.rates.gold_price_per_gram.toFixed(2)} {sym}{z('perGram')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <span className="text-muted-foreground">{z('silverPrice')}:</span>
              <span className="font-medium">{data.rates.silver_price_per_gram.toFixed(2)} {sym}{z('perGram')}</span>
            </div>
          </div>

          {/* Manual input fields */}
          {editingRates && (
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">{z('goldPrice')} ({sym}/g)</label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={manualGold}
                    onChange={e => setManualGold(e.target.value)}
                    className="h-8 text-sm bg-background"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">{z('silverPrice')} ({sym}/g)</label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={manualSilver}
                    onChange={e => setManualSilver(e.target.value)}
                    className="h-8 text-sm bg-background"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onManualRateChange(parseFloat(manualGold) || 0, parseFloat(manualSilver) || 0);
                    setEditingRates(false);
                  }}
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
                >
                  {language === 'fr' ? 'Appliquer' : 'Apply'}
                </Button>
                <a
                  href="https://www.veracash.com/fr/cours-or"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors flex-1 justify-center"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {language === 'fr' ? "Cours de l'or/argent en direct" : 'Live gold/silver prices'}
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Days remaining timeline */}
      {daysInfo ? (
        <Card className={`border-${themeColor}/20 overflow-hidden`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className={`h-4 w-4 text-${themeColor}`} />
              <span className="text-xs font-medium">{z('daysRemainingTimeline')}</span>
            </div>
            <div className="relative mb-3">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all bg-gradient-to-r ${isGold ? 'from-gold-dim to-gold' : 'from-silver-dim to-silver'}`}
                  style={{ width: `${daysInfo.percent}%` }}
                />
              </div>
              {/* Markers */}
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">{z('today')}</span>
                <span className={`text-[10px] font-medium text-${themeColor}`}>{daysInfo.displayLabel}</span>
              </div>
            </div>
            <div className="text-center">
              <span className={`text-3xl font-bold ${isGold ? 'text-foreground' : 'text-silver-gradient'}`} style={{ fontFamily: "'Amiri', serif" }}>
                {daysInfo.daysLeft}
              </span>
              <span className="text-xs text-muted-foreground ml-2">{z('daysRemaining')}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border border-dashed">
          <CardContent className="pt-4 pb-4 text-center">
            <CalendarClock className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">{z('noDateSet')}</p>
            <Button variant="outline" size="sm" onClick={onGoToSettings} className="text-xs h-8 gap-1.5">
              <Settings className="h-3.5 w-3.5" /> {z('setDateInSettings')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard icon={<TrendingUp className="h-4 w-4" />} label={z('totalAssets')} value={formatMoney(calc.totalAssets, cur)} color="text-primary" />
        <KPICard icon={<Wallet className="h-4 w-4" />} label={z('deductibleDebts')} value={formatMoney(calc.totalDebts, cur)} color="text-destructive" />
        <KPICard icon={<Coins className="h-4 w-4" />} label={z('netZakatable')} value={formatMoney(calc.netZakatable, cur)} color={`text-${themeColor}`} highlight highlightColor={themeColor} />
        <KPICard icon={<Info className="h-4 w-4" />} label={`${z('nisab')} (${themeLabel})`} value={formatMoney(calc.nisab, cur)} color={`text-${themeColor}`} />
      </div>

      {/* Nisab method reminder */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${isGold ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-silver/5 border-silver/20 text-silver'}`}>
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          {language === 'fr'
            ? `Méthode Nisab : ${isGold ? 'Or' : 'Argent'} — seuil à ${formatMoney(calc.nisab, cur)}`
            : `Nisab method: ${isGold ? 'Gold' : 'Silver'} — threshold at ${formatMoney(calc.nisab, cur)}`}
        </span>
      </div>

      {/* Zakat Due - Hero card */}
      <Card className={`border-${themeColor}/30 bg-gradient-to-br from-card to-secondary/30 overflow-hidden relative`}>
        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${themeColor}/40 to-transparent`} />
        <CardContent className="pt-5 pb-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">{z('zakatDue')}</p>
          <p className={`text-4xl font-bold ${isGold ? 'text-foreground' : 'text-silver-gradient'}`} style={{ fontFamily: "'Amiri', serif" }}>
            {formatMoney(calc.zakatDue, cur)}
          </p>
          {calc.isAboveNisab && (
            <Badge className={`mt-2 text-[10px] ${isGold ? 'bg-primary/15 text-primary border-primary/30' : 'bg-silver/15 text-silver border-silver/30'}`}>{z('zakatIsDue')}</Badge>
          )}
        </CardContent>
      </Card>

      {/* Nisab progress */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{calc.nisabPercent >= 100 ? '100' : Math.round(calc.nisabPercent)}% {z('nisabReached')}</span>
            {calc.isAboveNisab ? (
              <Badge className={`text-[10px] ${isGold ? 'bg-primary/15 text-primary border-primary/30' : 'bg-silver/15 text-silver border-silver/30'}`}>✓ {z('zakatIsDue')}</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">{z('belowNisab')}</Badge>
            )}
          </div>
          <Progress value={progressValue} className={`h-3 bg-secondary [&>div]:bg-gradient-to-r ${isGold ? '[&>div]:from-gold-dim [&>div]:to-gold' : '[&>div]:from-silver-dim [&>div]:to-silver'}`} />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Donut */}
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground mb-3">{z('assetBreakdown')}</p>
            {donutData.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-28 h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 text-[10px]">
                  {donutData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50 text-center py-6">—</p>
            )}
          </CardContent>
        </Card>

        {/* Line chart */}
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground mb-3">{z('zakatOverYears')}</p>
            {historyData.length > 0 ? (
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                      formatter={(value: number) => [formatMoney(value, cur), z('zakatDue')]}
                    />
                    <Line type="monotone" dataKey="zakat" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ fill: 'hsl(var(--gold))', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50 text-center py-6">{z('noHistoryYet')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onGoToSimulator} className="h-10 text-xs border-border hover:border-primary/30 hover:text-primary gap-1.5">
          <Calculator className="h-3.5 w-3.5" /> {z('editAssets')}
        </Button>
        <Button variant="outline" size="sm" onClick={onGoToHistory} className="h-10 text-xs border-border hover:border-primary/30 hover:text-primary gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {z('history')}
        </Button>
      </div>
      {calc.isAboveNisab && (
        <Button onClick={onMarkPaid} className={`w-full h-11 text-primary-foreground gap-2 ${isGold ? 'bg-primary hover:bg-primary/90' : 'bg-silver hover:bg-silver-dim'}`}>
          <CheckCircle2 className="h-4 w-4" /> {z('markAsPaid')}
        </Button>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, color, highlight, highlightColor = 'gold' }: { icon: React.ReactNode; label: string; value: string; color: string; highlight?: boolean; highlightColor?: string }) {
  return (
    <Card className={`border-border ${highlight ? `border-${highlightColor}/30 bg-gradient-to-br from-card to-${highlightColor}/5` : ''}`}>
      <CardContent className="pt-3 pb-3 px-4">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={color}>{icon}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <p className={`text-lg font-semibold ${highlight ? (highlightColor === 'gold' ? 'text-foreground' : 'text-silver-gradient') : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
