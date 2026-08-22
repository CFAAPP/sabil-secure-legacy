import { useState } from 'react';
import { format } from 'date-fns';
import type { Language } from '@/lib/i18n';
import type { ZakatSettings } from '@/hooks/useZakatData';
import { CURRENCIES } from '@/lib/zakatCalc';
import { zt } from '@/lib/zakatI18n';
import { formatHijriForStorage, parseStoredDate, formatHijriDisplay, gregorianToHijri, type HijriDate } from '@/lib/hijri';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import HijriCalendar from '@/components/zakat/HijriCalendar';
import { Save, Loader2, Coins, Calendar as CalendarIcon, Bell, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  settings: ZakatSettings;
  language: Language;
  onSettingsChange: (settings: ZakatSettings) => void;
  onSave: () => void;
  saving: boolean;
}

export default function ZakatSettingsPanel({ settings, language, onSettingsChange, onSave, saving }: Props) {
  const z = (key: Parameters<typeof zt>[0]) => zt(key, language);
  const [dateOpen, setDateOpen] = useState(false);

  const update = (partial: Partial<ZakatSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const parsed = parseStoredDate(settings.annual_date);
  const isHijri = settings.calendar_type === 'hijri';

  const displayDate = (() => {
    if (!settings.annual_date) return null;
    if (isHijri && parsed.hijri) {
      return formatHijriDisplay(parsed.hijri, language);
    }
    if (parsed.gregorianStr) {
      try {
        return format(new Date(parsed.gregorianStr), 'PPP');
      } catch { return parsed.gregorianStr; }
    }
    return null;
  })();

  const handleCalendarTypeChange = (type: 'gregorian' | 'hijri') => {
    // Clear date when switching type to avoid format mismatch
    update({ calendar_type: type, annual_date: null });
  };

  const handleGregorianSelect = (date: Date | undefined) => {
    if (date) {
      update({ annual_date: format(date, 'yyyy-MM-dd') });
      setDateOpen(false);
    }
  };

  const handleHijriSelect = (h: HijriDate) => {
    update({ annual_date: formatHijriForStorage(h) });
    setDateOpen(false);
  };

  const selectedGregorianDate = !isHijri && parsed.gregorianStr ? new Date(parsed.gregorianStr) : undefined;

  return (
    <div className="space-y-4">
      {/* Currency & Nisab */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" /> {z('currency')} & {z('nisabMethod')}
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
            <CalendarIcon className="h-4 w-4 text-primary" /> {z('annualDate')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Calendar type toggle */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">{z('calendarType')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCalendarTypeChange('gregorian')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                  !isHijri
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent/50'
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                {z('solarYear')}
              </button>
              <button
                type="button"
                onClick={() => handleCalendarTypeChange('hijri')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                  isHijri
                    ? 'border-gold bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent/50'
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                {z('lunarYear')}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {isHijri
                ? (language === 'fr'
                    ? "Calendrier lunaire (recommandé) : le hawl islamique dure 354 jours. Taux appliqué : 2,5 %."
                    : language === 'ar'
                    ? 'التقويم القمري (موصى به): الحول الشرعي ٣٥٤ يوماً. النسبة المطبقة: ٢٫٥٪.'
                    : 'Lunar calendar (recommended): the Islamic hawl lasts 354 days. Applied rate: 2.5%.')
                : (language === 'fr'
                    ? "Année solaire : elle compte 11 jours de plus que le hawl lunaire. Le taux est ajusté à 2,577 % (2,5 % × 365/354) pour ne pas sous-évaluer la zakât."
                    : language === 'ar'
                    ? 'السنة الشمسية أطول من الحول القمري بـ ١١ يوماً، لذا تُعدَّل النسبة إلى ٢٫٥٧٧٪ (٢٫٥٪ × ٣٦٥/٣٥٤).'
                    : 'Solar year: it is 11 days longer than the lunar hawl. The rate is adjusted to 2.577% (2.5% × 365/354) so zakat is not underpaid.')}
            </p>
          </div>


          {/* Date picker */}
          <div>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-9 text-sm',
                    !displayDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {displayDate || z('pickDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {isHijri ? (
                  <HijriCalendar
                    selected={parsed.hijri}
                    onSelect={handleHijriSelect}
                    language={language}
                  />
                ) : (
                  <Calendar
                    mode="single"
                    selected={selectedGregorianDate}
                    onSelect={handleGregorianSelect}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                )}
              </PopoverContent>
            </Popover>
          </div>
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

      <Button onClick={onSave} disabled={saving} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-11">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {z('saveData')}
      </Button>
    </div>
  );
}
