import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';

export interface ReminderSettingsData {
  frequency: 'off' | 'weekly' | 'monthly' | 'quarterly' | 'custom_days';
  custom_days: number;
  enabled: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  settings: ReminderSettingsData;
  onSave: (data: ReminderSettingsData) => Promise<void>;
  saving: boolean;
}

export default function ReminderSettingsDialog({ open, onOpenChange, language, settings, onSave, saving }: Props) {
  const t = useTranslation(language);
  const [form, setForm] = useState<ReminderSettingsData>(settings);

  useEffect(() => { setForm(settings); }, [settings, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t('reminderSettings')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('reminderFrequency')}</Label>
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as ReminderSettingsData['frequency'], enabled: v !== 'off' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">{t('reminderOff')}</SelectItem>
                <SelectItem value="weekly">{t('reminderWeekly')}</SelectItem>
                <SelectItem value="monthly">{t('reminderMonthly')}</SelectItem>
                <SelectItem value="quarterly">{t('reminderQuarterly')}</SelectItem>
                <SelectItem value="custom_days">{t('reminderCustom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.frequency === 'custom_days' && (
            <div className="space-y-1.5">
              <Label>{t('reminderCustomDays')}</Label>
              <Input type="number" min={1} max={365} value={form.custom_days} onChange={(e) => setForm({ ...form, custom_days: parseInt(e.target.value) || 30 })} />
            </div>
          )}

          <Button onClick={() => onSave(form)} className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
