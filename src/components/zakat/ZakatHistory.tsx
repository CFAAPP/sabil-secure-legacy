import type { Language } from '@/lib/i18n';
import type { ZakatHistoryEntry } from '@/hooks/useZakatData';
import { formatMoney } from '@/lib/zakatCalc';
import { zt } from '@/lib/zakatI18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Copy, Save, Loader2 } from 'lucide-react';

interface Props {
  history: ZakatHistoryEntry[];
  currency: string;
  language: Language;
  onMarkPaid: (yearKey: string) => void;
  onDuplicatePrevious: () => void;
  onSave: () => void;
  saving: boolean;
}

export default function ZakatHistory({ history, currency, language, onMarkPaid, onDuplicatePrevious, onSave, saving }: Props) {
  const z = (key: Parameters<typeof zt>[0]) => zt(key, language);

  const chartData = history.map(h => ({
    year: h.year_key,
    zakat: h.zakat_due,
  }));

  if (!history.length) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{z('noHistory')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      {chartData.length > 1 && (
        <Card className="border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground mb-3">{z('zakatOverYears')}</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                    formatter={(value: number) => [formatMoney(value, currency), z('zakatDue')]}
                  />
                  <Line type="monotone" dataKey="zakat" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ fill: 'hsl(var(--gold))', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries */}
      <div className="space-y-3">
        {[...history].reverse().map(entry => (
          <Card key={entry.year_key} className="border-border">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-lg font-bold">{entry.year_key}</h3>
                {entry.paid ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {z('paid')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-gold border-gold/30">{z('unpaid')}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div><span className="block text-[10px] uppercase tracking-wider">{z('netZakatable')}</span>{formatMoney(entry.net_zakatable, currency)}</div>
                <div><span className="block text-[10px] uppercase tracking-wider">{z('nisab')}</span>{formatMoney(entry.nisab_used, currency)}</div>
                <div><span className="block text-[10px] uppercase tracking-wider">{z('zakatDue')}</span><span className="text-gold font-semibold">{formatMoney(entry.zakat_due, currency)}</span></div>
                <div><span className="block text-[10px] uppercase tracking-wider">{z('method')}</span>{entry.method === 'gold' ? z('goldPrice') : z('silverPrice')}</div>
              </div>
              {entry.payment_date && (
                <p className="text-[10px] text-muted-foreground mt-1">{z('paymentDate')}: {entry.payment_date}</p>
              )}
              {!entry.paid && (
                <Button variant="outline" size="sm" onClick={() => onMarkPaid(entry.year_key)} className="mt-2 w-full text-xs gap-1 border-gold/30 text-gold hover:bg-gold/5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {z('markAsPaid')}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onDuplicatePrevious} className="text-xs gap-1.5">
          <Copy className="h-3.5 w-3.5" /> {z('duplicatePrevious')}
        </Button>
        <Button onClick={onSave} disabled={saving} className="bg-gold hover:bg-gold-dim text-primary-foreground text-xs gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {z('saveData')}
        </Button>
      </div>
    </div>
  );
}
