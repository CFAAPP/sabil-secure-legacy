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
import ProofUpload from './ProofUpload';

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
  userId?: string;
}

export default function DebtFormDialog({ open, onOpenChange, language, editingDebt, onSave, onDelete, saving, userId }: DebtFormDialogProps) {
  const t = useTranslation(language);
  const [proofs, setProofs] = useState<any[]>([]);
  const [form, setForm] = useState<DebtFormData>({
    type: 'i_owe', name: '', amount: '', currency: 'EUR', hasDueDate: false, dueDate: undefined, notes: '', status: 'pending', creditorEmail: '', creditorPhone: '',
  });

  // Load proofs when editing
  useEffect(() => {
    if (editingDebt?.id && userId) {
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.from('debt_proofs').select('*').eq('debt_id', editingDebt.id).then(({ data }) => {
          setProofs(data || []);
        });
      });
    } else {
      setProofs([]);
    }
  }, [editingDebt, open, userId]);

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

  const isValid = form.name.trim() && form.amount.trim() && form.creditorEmail.trim() && form.creditorPhone.trim();

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

          {/* Contact info (required for both types) */}
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {form.type === 'i_owe'
                ? (language === 'fr' ? '📧 Contact du créancier (obligatoire)' : '📧 Creditor contact (required)')
                : (language === 'fr' ? '📧 Contact de l\'emprunteur (obligatoire)' : '📧 Borrower contact (required)')
              }
            </p>
            <div className="space-y-1.5">
              <Label>{t('email')} *</Label>
              <Input type="email" value={form.creditorEmail} onChange={(e) => setForm({ ...form, creditorEmail: e.target.value })} placeholder={form.type === 'i_owe' ? 'creancier@email.com' : 'emprunteur@email.com'} required />
            </div>
            <div className="space-y-1.5">
              <Label>{language === 'fr' ? 'Téléphone' : 'Phone'} *</Label>
              <Input type="tel" value={form.creditorPhone} onChange={(e) => setForm({ ...form, creditorPhone: e.target.value })} placeholder="+33 6 12 34 56 78" required />
            </div>
          </div>

          {/* Proof of payment */}
          <ProofUpload
            debtId={editingDebt?.id || null}
            userId={userId || ''}
            language={language}
            proofs={proofs}
            onProofsChange={setProofs}
          />

          {/* Status */}
          <div className="space-y-2">
            <Label>Statut</Label>
            <div className="flex gap-2">
              <Button
                variant={form.status === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, status: 'pending' })}
                disabled={editingDebt?.status === 'paid'}
                title={editingDebt?.status === 'paid' ? (language === 'fr' ? 'Impossible de revenir en arrière sans validation des deux parties' : 'Cannot revert without both parties validation') : undefined}
              >
                {t('statusPending')}
              </Button>
              <Button variant={form.status === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, status: 'paid' })}>{t('statusPaid')}</Button>
            </div>
            {editingDebt?.status === 'paid' && (
              <p className="text-xs text-muted-foreground">
                🔒 {language === 'fr' ? 'Cette dette est marquée comme payée. Toute modification requiert la validation des deux parties.' : 'This debt is marked as paid. Any change requires validation from both parties.'}
              </p>
            )}
            {form.type === 'i_owe' && form.status === 'paid' && form.creditorEmail && editingDebt?.status !== 'paid' && (
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
