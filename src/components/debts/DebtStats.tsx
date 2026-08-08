import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { DebtItem } from './DebtCard';
import type { Language } from '@/lib/i18n';

interface DebtStatsProps {
  debts: DebtItem[];
  language: Language;
}

const GOLD = 'hsl(43, 72%, 58%)';
const GOLD_DIM = 'hsl(43, 55%, 35%)';
const NAVY = 'hsl(222, 30%, 18%)';
const RED = 'hsl(0, 72%, 51%)';
const EMERALD = 'hsl(142, 71%, 45%)';
const BLUE = 'hsl(210, 70%, 55%)';

// Sum amounts grouped by currency
function sumByCurrency(items: DebtItem[]): Record<string, number> {
  return items.reduce((acc, d) => {
    const cur = d.currency || '—';
    acc[cur] = (acc[cur] || 0) + (parseFloat(d.amount) || 0);
    return acc;
  }, {} as Record<string, number>);
}

// Format a currency map as "1 200 EUR · 500 USD"
function formatCurrencyMap(map: Record<string, number>, locale: string) {
  const entries = Object.entries(map).filter(([, v]) => v > 0);
  if (entries.length === 0) return '—';
  return entries.map(([cur, val]) =>
    `${val.toLocaleString(locale, { maximumFractionDigits: 0 })} ${cur}`
  ).join(' · ');
}

export default function DebtStats({ debts, language }: DebtStatsProps) {
  const isFr = language === 'fr';
  const locale = isFr ? 'fr-FR' : 'en-US';

  const { iOwePending, iOwePaid, owedPending, owedPaid, overdue } = useMemo(() => {
    const iOwe = debts.filter(d => d.debt_type === 'i_owe');
    const owedToMe = debts.filter(d => d.debt_type === 'owed_to_me');
    const today = new Date(); today.setHours(0, 0, 0, 0);

    return {
      iOwePending: iOwe.filter(d => d.status === 'pending'),
      iOwePaid: iOwe.filter(d => d.status === 'paid'),
      owedPending: owedToMe.filter(d => d.status === 'pending'),
      owedPaid: owedToMe.filter(d => d.status === 'paid'),
      overdue: debts.filter(d => d.status === 'pending' && d.due_date && new Date(d.due_date) < today),
    };
  }, [debts]);

  const iOweByCur = sumByCurrency(iOwePending);
  const owedByCur = sumByCurrency(owedPending);

  // Net balance: only meaningful if single currency
  const allCurrencies = Array.from(new Set([...Object.keys(iOweByCur), ...Object.keys(owedByCur)]));
  const netByCur: Record<string, number> = {};
  allCurrencies.forEach(cur => {
    netByCur[cur] = (owedByCur[cur] || 0) - (iOweByCur[cur] || 0);
  });
  const netStr = Object.entries(netByCur)
    .filter(([, v]) => v !== 0)
    .map(([cur, v]) => `${v >= 0 ? '+' : ''}${v.toLocaleString(locale, { maximumFractionDigits: 0 })} ${cur}`)
    .join(' · ') || '0';
  const netPositive = Object.values(netByCur).every(v => v >= 0);

  // Pie: total pending amounts (sum all currencies together for proportion)
  const totalIOwe = iOwePending.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const totalOwed = owedPending.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const pieData = [
    { name: isFr ? 'Je dois' : 'I Owe', value: Math.max(totalIOwe, 0.01), color: RED },
    { name: isFr ? 'On me doit' : 'Owed to me', value: Math.max(totalOwed, 0.01), color: EMERALD },
  ];

  // Bar: by currency
  const currencyMap: Record<string, { owe: number; owed: number }> = {};
  debts.filter(d => d.status === 'pending').forEach(d => {
    if (!currencyMap[d.currency]) currencyMap[d.currency] = { owe: 0, owed: 0 };
    if (d.debt_type === 'i_owe') currencyMap[d.currency].owe += parseFloat(d.amount) || 0;
    else currencyMap[d.currency].owed += parseFloat(d.amount) || 0;
  });
  const barData = Object.entries(currencyMap).map(([cur, vals]) => ({
    currency: cur,
    [isFr ? 'Je dois' : 'I owe']: Math.round(vals.owe),
    [isFr ? 'On me doit' : 'Owed to me']: Math.round(vals.owed),
  }));

  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 0 });

  if (debts.length === 0) return null;

  const iOweStr = formatCurrencyMap(iOweByCur, locale);
  const owedStr = formatCurrencyMap(owedByCur, locale);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: isFr ? 'Je dois' : 'I owe',
            value: iOweStr,
            sub: `${iOwePending.length} dette${iOwePending.length > 1 ? 's' : ''}`,
            color: 'text-red-500',
            glow: 'hsl(0 72% 51% / 0.08)',
            border: 'border-red-400/20',
          },
          {
            label: isFr ? 'On me doit' : 'Owed to me',
            value: owedStr,
            sub: `${owedPending.length} créance${owedPending.length > 1 ? 's' : ''}`,
            color: 'text-emerald-600',
            glow: 'hsl(142 71% 45% / 0.08)',
            border: 'border-emerald-400/20',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-xl border ${kpi.border} p-3 text-center`}
            style={{ background: kpi.glow }}
          >
            <p className="text-xs text-muted-foreground mb-1 leading-tight">{kpi.label}</p>
            <p className={`text-sm font-bold ${kpi.color} leading-tight break-words`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pie chart */}
        <div
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground mb-3 text-center uppercase tracking-widest">
            {isFr ? 'Répartition' : 'Distribution'}
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={50}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(150 5% 12%)',
                  border: '1px solid hsl(150 5% 22%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(80 10% 96%)',
                }}
                formatter={(val: number) => [`${fmt(val)}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-1">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart by currency */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-3 text-center uppercase tracking-widest">
            {isFr ? 'Par devise' : 'By currency'}
          </p>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={barData} barSize={10} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150 5% 22%)" vertical={false} />
                <XAxis dataKey="currency" tick={{ fontSize: 10, fill: 'hsl(140 4% 62%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(140 4% 62%)' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(150 5% 12%)',
                    border: '1px solid hsl(150 5% 22%)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'hsl(80 10% 96%)',
                  }}
                />
                <Bar dataKey={isFr ? 'Je dois' : 'I owe'} fill={RED} opacity={0.8} radius={[4, 4, 0, 0]} />
                <Bar dataKey={isFr ? 'On me doit' : 'Owed to me'} fill={EMERALD} opacity={0.8} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[120px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">{isFr ? 'Aucune donnée' : 'No data'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Paid stats */}
      {(iOwePaid.length > 0 || owedPaid.length > 0) && (
        <div className="flex gap-2 text-xs text-muted-foreground">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
            <span>{isFr ? `${iOwePaid.length} dette${iOwePaid.length > 1 ? 's' : ''} soldée${iOwePaid.length > 1 ? 's' : ''}` : `${iOwePaid.length} paid`}</span>
            <span className="ml-auto text-muted-foreground/50">{formatCurrencyMap(sumByCurrency(iOwePaid), locale)}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-primary/60" />
            <span>{isFr ? `${owedPaid.length} créance${owedPaid.length > 1 ? 's' : ''} soldée${owedPaid.length > 1 ? 's' : ''}` : `${owedPaid.length} collected`}</span>
            <span className="ml-auto text-muted-foreground/50">{formatCurrencyMap(sumByCurrency(owedPaid), locale)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
