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
import { CalendarIcon, Loader2, Trash2, Users } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';
import type { DebtItem } from './DebtCard';
import ProofUpload from './ProofUpload';
import PaymentsSection from './PaymentsSection';
import MentionsInput from '@/components/MentionsInput';
import { format as fmtDate } from 'date-fns';

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
  witness1Name: string;
  witness1Email: string;
  witness1Phone: string;
  witness2Name: string;
  witness2Email: string;
  witness2Phone: string;
  mentions: string;
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
  initialMentions?: string;
}

export default function DebtFormDialog({ open, onOpenChange, language, editingDebt, onSave, onDelete, saving, userId, initialMentions }: DebtFormDialogProps) {
  const t = useTranslation(language);
  const isFr = language === 'fr';
  const [proofs, setProofs] = useState<any[]>([]);

  const emptyForm: DebtFormData = {
    type: 'i_owe', name: '', amount: '', currency: 'EUR', hasDueDate: false, dueDate: undefined,
    notes: '', status: 'pending', creditorEmail: '', creditorPhone: '',
    witness1Name: '', witness1Email: '', witness1Phone: '',
    witness2Name: '', witness2Email: '', witness2Phone: '',
    mentions: '',
  };

  const [form, setForm] = useState<DebtFormData>(emptyForm);

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
        witness1Name: (editingDebt as any).witness1_name || '',
        witness1Email: (editingDebt as any).witness1_email || '',
        witness1Phone: (editingDebt as any).witness1_phone || '',
        witness2Name: (editingDebt as any).witness2_name || '',
        witness2Email: (editingDebt as any).witness2_email || '',
        witness2Phone: (editingDebt as any).witness2_phone || '',
        mentions: initialMentions || '',
      });
    } else {
      setForm({ ...emptyForm, mentions: initialMentions || '' });
    }
  }, [editingDebt, open, initialMentions]);

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
                ? (isFr ? '📧 Contact du créancier (obligatoire)' : '📧 Creditor contact (required)')
                : (isFr ? '📧 Contact de l\'emprunteur (obligatoire)' : '📧 Borrower contact (required)')
              }
            </p>
            <div className="space-y-1.5">
              <Label>{t('email')} *</Label>
              <Input type="email" value={form.creditorEmail} onChange={(e) => setForm({ ...form, creditorEmail: e.target.value })} placeholder={form.type === 'i_owe' ? 'creancier@email.com' : 'emprunteur@email.com'} required />
            </div>
            <div className="space-y-1.5">
              <Label>{isFr ? 'Téléphone' : 'Phone'} *</Label>
              <Input type="tel" value={form.creditorPhone} onChange={(e) => setForm({ ...form, creditorPhone: e.target.value })} placeholder="+33 6 12 34 56 78" required />
            </div>
          </div>

          {/* Witnesses */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">
                {isFr ? 'Témoins de la transaction (optionnel)' : 'Transaction witnesses (optional)'}
              </p>
            </div>

            {/* Witness 1 */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground/70">
                {isFr ? 'Témoin 1' : 'Witness 1'}
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">{isFr ? 'Nom complet' : 'Full name'}</Label>
                <Input
                  value={form.witness1Name}
                  onChange={(e) => setForm({ ...form, witness1Name: e.target.value })}
                  placeholder={isFr ? 'Prénom Nom' : 'First Last'}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('email')}</Label>
                  <Input
                    type="email"
                    value={form.witness1Email}
                    onChange={(e) => setForm({ ...form, witness1Email: e.target.value })}
                    placeholder="temoin1@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isFr ? 'Téléphone' : 'Phone'}</Label>
                  <Input
                    type="tel"
                    value={form.witness1Phone}
                    onChange={(e) => setForm({ ...form, witness1Phone: e.target.value })}
                    placeholder="+33 6 00 00 00 00"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border/40" />

            {/* Witness 2 */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground/70">
                {isFr ? 'Témoin 2' : 'Witness 2'}
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">{isFr ? 'Nom complet' : 'Full name'}</Label>
                <Input
                  value={form.witness2Name}
                  onChange={(e) => setForm({ ...form, witness2Name: e.target.value })}
                  placeholder={isFr ? 'Prénom Nom' : 'First Last'}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('email')}</Label>
                  <Input
                    type="email"
                    value={form.witness2Email}
                    onChange={(e) => setForm({ ...form, witness2Email: e.target.value })}
                    placeholder="temoin2@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isFr ? 'Téléphone' : 'Phone'}</Label>
                  <Input
                    type="tel"
                    value={form.witness2Phone}
                    onChange={(e) => setForm({ ...form, witness2Phone: e.target.value })}
                    placeholder="+33 6 00 00 00 00"
                  />
                </div>
              </div>
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

          <PaymentsSection
            debtId={editingDebt?.id || null}
            totalAmount={parseFloat(form.amount) || 0}
            currency={form.currency || 'EUR'}
            dueDate={form.hasDueDate && form.dueDate ? fmtDate(form.dueDate, 'yyyy-MM-dd') : null}
            language={language}
          />


          <MentionsInput
            value={form.mentions}
            onChange={(v) => setForm({ ...form, mentions: v })}
            language={language}
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
                title={editingDebt?.status === 'paid' ? (isFr ? 'Impossible de revenir en arrière sans validation des deux parties' : 'Cannot revert without both parties validation') : undefined}
              >
                {t('statusPending')}
              </Button>
              <Button variant={form.status === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, status: 'paid' })}>{t('statusPaid')}</Button>
            </div>
            {editingDebt?.status === 'paid' && (
              <p className="text-xs text-muted-foreground">
                🔒 {isFr ? 'Cette dette est marquée comme payée. Toute modification requiert la validation des deux parties.' : 'This debt is marked as paid. Any change requires validation from both parties.'}
              </p>
            )}
            {form.type === 'i_owe' && form.status === 'paid' && form.creditorEmail && editingDebt?.status !== 'paid' && (
              <p className="text-xs text-muted-foreground">
                ⚠️ {isFr ? 'Le créancier devra valider par email avant que la dette soit marquée comme payée.' : 'The creditor must validate via email before the debt is marked as paid.'}
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
