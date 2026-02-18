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

function sumAmount(items: DebtItem[]) {
  return items.reduce((acc, d) => acc + (parseFloat(d.amount) || 0), 0);
}

export default function DebtStats({ debts, language }: DebtStatsProps) {
  const isFr = language === 'fr';

  const { iOwe, owedToMe, iOwePending, iOwePaid, owedPending, owedPaid, overdue } = useMemo(() => {
    const iOwe = debts.filter(d => d.debt_type === 'i_owe');
    const owedToMe = debts.filter(d => d.debt_type === 'owed_to_me');
    const today = new Date(); today.setHours(0, 0, 0, 0);

    return {
      iOwe,
      owedToMe,
      iOwePending: iOwe.filter(d => d.status === 'pending'),
      iOwePaid: iOwe.filter(d => d.status === 'paid'),
      owedPending: owedToMe.filter(d => d.status === 'pending'),
      owedPaid: owedToMe.filter(d => d.status === 'paid'),
      overdue: debts.filter(d => d.status === 'pending' && d.due_date && new Date(d.due_date) < today),
    };
  }, [debts]);

  const totalIOwe = sumAmount(iOwePending);
  const totalOwedToMe = sumAmount(owedPending);
  const netBalance = totalOwedToMe - totalIOwe;

  // Pie: statuses
  const pieData = [
    { name: isFr ? 'Je dois' : 'I Owe', value: Math.max(totalIOwe, 0.01), color: RED },
    { name: isFr ? 'On me doit' : 'Owed to me', value: Math.max(totalOwedToMe, 0.01), color: EMERALD },
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

  const fmt = (n: number) => n.toLocaleString(isFr ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 });

  if (debts.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: isFr ? 'Je dois' : 'I owe',
            value: fmt(totalIOwe),
            sub: `${iOwePending.length} dette${iOwePending.length > 1 ? 's' : ''}`,
            color: 'text-red-400',
            glow: 'hsl(0 72% 51% / 0.12)',
            border: 'border-red-500/20',
          },
          {
            label: isFr ? 'On me doit' : 'Owed to me',
            value: fmt(totalOwedToMe),
            sub: `${owedPending.length} créance${owedPending.length > 1 ? 's' : ''}`,
            color: 'text-emerald-400',
            glow: 'hsl(142 71% 45% / 0.12)',
            border: 'border-emerald-500/20',
          },
          {
            label: isFr ? 'Solde net' : 'Net balance',
            value: (netBalance >= 0 ? '+' : '') + fmt(netBalance),
            sub: overdue.length > 0 ? `${overdue.length} en retard` : isFr ? 'À jour' : 'Up to date',
            color: netBalance >= 0 ? 'text-gold' : 'text-red-400',
            glow: netBalance >= 0 ? 'hsl(43 72% 58% / 0.12)' : 'hsl(0 72% 51% / 0.12)',
            border: netBalance >= 0 ? 'border-gold/20' : 'border-red-500/20',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-xl border ${kpi.border} p-3 text-center`}
            style={{ background: kpi.glow }}
          >
            <p className="text-xs text-muted-foreground mb-1 leading-tight">{kpi.label}</p>
            <p className={`text-base font-bold ${kpi.color} leading-tight`}>{kpi.value}</p>
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
                  background: 'hsl(38 22% 92%)',
                  border: '1px solid hsl(38 18% 80%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(155 20% 14%)',
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(38 18% 82%)" vertical={false} />
                <XAxis dataKey="currency" tick={{ fontSize: 10, fill: 'hsl(155 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(155 12% 42%)' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(38 22% 92%)',
                    border: '1px solid hsl(38 18% 80%)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'hsl(155 20% 14%)',
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
            <span className="ml-auto text-muted-foreground/50">{fmt(sumAmount(iOwePaid))}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-gold/60" />
            <span>{isFr ? `${owedPaid.length} créance${owedPaid.length > 1 ? 's' : ''} soldée${owedPaid.length > 1 ? 's' : ''}` : `${owedPaid.length} collected`}</span>
            <span className="ml-auto text-muted-foreground/50">{fmt(sumAmount(owedPaid))}</span>
          </div>
        </div>
      )}
    </div>
  );
}
