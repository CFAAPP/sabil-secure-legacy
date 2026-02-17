import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';
import type { DebtItem } from './DebtCard';

export interface DebtFormData {
  type: 'i_owe' | 'owed_to_me';
  name: string;
  amount: string;
  currency: string;
  hasDueDate: boolean;
  dueDate: Date | undefined;
  notes: string;
  status: 'pending' | 'paid';
  creditorEmail: string;
  creditorPhone: string;
}

interface DebtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  editingDebt?: DebtItem | null;
  onSave: (data: DebtFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  saving: boolean;
}

export default function DebtFormDialog({ open, onOpenChange, language, editingDebt, onSave, onDelete, saving }: DebtFormDialogProps) {
  const t = useTranslation(language);
  const [form, setForm] = useState<DebtFormData>({
    type: 'i_owe', name: '', amount: '', currency: 'EUR', hasDueDate: false, dueDate: undefined, notes: '', status: 'pending', creditorEmail: '', creditorPhone: '',
  });

  useEffect(() => {
    if (editingDebt) {
      setForm({
        type: editingDebt.debt_type,
        name: editingDebt.name,
        amount: editingDebt.amount,
        currency: editingDebt.currency,
        hasDueDate: !!editingDebt.due_date,
        dueDate: editingDebt.due_date ? new Date(editingDebt.due_date) : undefined,
        notes: editingDebt.notes || '',
        status: editingDebt.status,
        creditorEmail: editingDebt.creditor_email || '',
        creditorPhone: editingDebt.creditor_phone || '',
      });
    } else {
      setForm({ type: 'i_owe', name: '', amount: '', currency: 'EUR', hasDueDate: false, dueDate: undefined, notes: '', status: 'pending', creditorEmail: '', creditorPhone: '' });
    }
  }, [editingDebt, open]);

  const isValid = form.name.trim() && form.amount.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{editingDebt ? t('editDebt') : t('addDebt')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            <Button variant={form.type === 'i_owe' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, type: 'i_owe' })}>{t('iOwe')}</Button>
            <Button variant={form.type === 'owed_to_me' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, type: 'owed_to_me' })}>{t('owedToMe')}</Button>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t('name')} *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label>{t('amount')} *</Label>
              <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="1200.00" inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('currency')}</Label>
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} placeholder="EUR" maxLength={3} />
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-2">
            <Label>{t('dueDate')}</Label>
            <RadioGroup value={form.hasDueDate ? 'yes' : 'no'} onValueChange={(v) => setForm({ ...form, hasDueDate: v === 'yes', dueDate: v === 'no' ? undefined : form.dueDate })}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="due-yes" />
                <Label htmlFor="due-yes" className="font-normal">{t('hasDueDate')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="due-no" />
                <Label htmlFor="due-no" className="font-normal">{t('noDueDate')}</Label>
              </div>
            </RadioGroup>
            {form.hasDueDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.dueDate ? format(form.dueDate, 'PPP') : t('dueDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.dueDate} onSelect={(d) => setForm({ ...form, dueDate: d })} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t('notes')}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          {/* Creditor contact (only for i_owe) */}
          {form.type === 'i_owe' && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {language === 'fr' ? '📧 Contact du créancier (pour validation)' : '📧 Creditor contact (for validation)'}
              </p>
              <div className="space-y-1.5">
                <Label>{t('email')}</Label>
                <Input type="email" value={form.creditorEmail} onChange={(e) => setForm({ ...form, creditorEmail: e.target.value })} placeholder="creancier@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label>{language === 'fr' ? 'Téléphone' : 'Phone'}</Label>
                <Input type="tel" value={form.creditorPhone} onChange={(e) => setForm({ ...form, creditorPhone: e.target.value })} placeholder="+33 6 12 34 56 78" />
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label>Statut</Label>
            <div className="flex gap-2">
              <Button variant={form.status === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, status: 'pending' })}>{t('statusPending')}</Button>
              <Button variant={form.status === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, status: 'paid' })}>{t('statusPaid')}</Button>
            </div>
            {form.type === 'i_owe' && form.status === 'paid' && form.creditorEmail && (
              <p className="text-xs text-muted-foreground">
                ⚠️ {language === 'fr' ? 'Le créancier devra valider par email avant que la dette soit marquée comme payée.' : 'The creditor must validate via email before the debt is marked as paid.'}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => onSave(form)} className="flex-1" disabled={saving || !isValid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
            {editingDebt && onDelete && (
              <Button variant="destructive" size="icon" onClick={() => onDelete(editingDebt.id)} disabled={saving}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
