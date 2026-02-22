import type { Language } from '@/lib/i18n';
import type { ZakatSettings } from '@/hooks/useZakatData';
import { CURRENCIES } from '@/lib/zakatCalc';
import { zt } from '@/lib/zakatI18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Coins, Calendar, Bell } from 'lucide-react';

interface Props {
  settings: ZakatSettings;
  language: Language;
  onSettingsChange: (settings: ZakatSettings) => void;
  onSave: () => void;
  saving: boolean;
}

export default function ZakatSettingsPanel({ settings, language, onSettingsChange, onSave, saving }: Props) {
  const z = (key: Parameters<typeof zt>[0]) => zt(key, language);

  const update = (partial: Partial<ZakatSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  return (
    <div className="space-y-4">
      {/* Currency & Nisab */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coins className="h-4 w-4 text-gold" /> {z('currency')} & {z('nisabMethod')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{z('currency')}</label>
            <Select value={settings.currency} onValueChange={v => update({ currency: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{z('nisabMethod')}</label>
            <Select value={settings.nisab_method} onValueChange={v => update({ nisab_method: v as 'gold' | 'silver' })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gold">{z('goldMethod')}</SelectItem>
                <SelectItem value="silver">{z('silverMethod')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Annual Date */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> {z('annualDate')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Input
            type="date"
            value={settings.annual_date || ''}
            onChange={e => update({ annual_date: e.target.value || null })}
            className="h-9 text-sm"
          />
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> {z('reminders')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{z('reminders')}</span>
            <Switch checked={settings.reminders.enabled} onCheckedChange={v => update({ reminders: { ...settings.reminders, enabled: v } })} />
          </div>
          {settings.reminders.enabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{z('reminder30d')}</span>
                <Switch checked={settings.reminders.d30} onCheckedChange={v => update({ reminders: { ...settings.reminders, d30: v } })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{z('reminder7d')}</span>
                <Switch checked={settings.reminders.d7} onCheckedChange={v => update({ reminders: { ...settings.reminders, d7: v } })} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={saving} className="w-full bg-gold hover:bg-gold-dim text-primary-foreground gap-1.5 h-11">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {z('saveData')}
      </Button>
    </div>
  );
}
