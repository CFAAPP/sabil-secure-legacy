import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Loader2, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { encrypt, decrypt, generateIv } from '@/lib/crypto';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Language } from '@/lib/i18n';

export interface DebtPayment {
  id: string;
  amount: number;
  paid_at: string; // ISO date
  notes: string | null;
}

interface Props {
  debtId: string | null;
  totalAmount: number;
  currency: string;
  dueDate?: string | null; // yyyy-mm-dd or null
  language: Language;
}

export default function PaymentsSection({ debtId, totalAmount, currency, dueDate, language }: Props) {
  const isFr = language === 'fr';
  const isAr = language === 'ar';
  const { user, passphrase, profile } = useAuth();
  const { toast } = useToast();

  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState<Date | undefined>(new Date());
  const [newNotes, setNewNotes] = useState('');

  const t = (fr: string, en: string, ar?: string) => (isAr && ar ? ar : isFr ? fr : en);

  const load = async () => {
    if (!debtId || !user || !passphrase || !profile?.encryption_salt) return;
    setLoading(true);
    const { data } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('created_at', { ascending: true });
    if (data) {
      const decrypted = await Promise.all(
        data.map(async (p: any) => {
          try {
            const [amt, at, notes] = await Promise.all([
              decrypt(p.amount_encrypted, p.iv, passphrase, profile.encryption_salt!),
              decrypt(p.paid_at_encrypted, p.iv, passphrase, profile.encryption_salt!),
              p.notes_encrypted ? decrypt(p.notes_encrypted, p.iv, passphrase, profile.encryption_salt!) : Promise.resolve(null),
            ]);
            return { id: p.id, amount: parseFloat(amt) || 0, paid_at: at, notes };
          } catch {
            return null;
          }
        })
      );
      setPayments(decrypted.filter(Boolean) as DebtPayment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtId]);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, totalAmount - totalPaid);
  const paidPct = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;

  const daysLeft = (() => {
    if (!dueDate) return null;
    const diff = new Date(dueDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  })();

  const handleAdd = async () => {
    if (!debtId) {
      toast({ title: t('Enregistrez la dette avant d\'ajouter un paiement', 'Save the debt before adding a payment'), variant: 'destructive' });
      return;
    }
    if (!user || !passphrase || !profile?.encryption_salt) return;
    const amt = parseFloat(newAmount);
    if (!amt || amt <= 0 || !newDate) {
      toast({ title: t('Montant et date requis', 'Amount and date required'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const iv = generateIv();
      const [{ ciphertext: amtEnc }, { ciphertext: atEnc }, { ciphertext: notesEnc }] = await Promise.all([
        encrypt(String(amt), passphrase, profile.encryption_salt, iv),
        encrypt(format(newDate, 'yyyy-MM-dd'), passphrase, profile.encryption_salt, iv),
        encrypt(newNotes || '', passphrase, profile.encryption_salt, iv),
      ]);
      await supabase.from('debt_payments').insert({
        debt_id: debtId,
        user_id: user.id,
        amount_encrypted: amtEnc,
        paid_at_encrypted: atEnc,
        notes_encrypted: newNotes ? notesEnc : null,
        iv,
      } as any);
      setNewAmount('');
      setNewNotes('');
      setNewDate(new Date());
      await load();
    } catch {
      toast({ title: t('Erreur', 'Error'), variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('debt_payments').delete().eq('id', id);
    await load();
  };

  const fmt = (n: number) => n.toLocaleString(isFr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 2 });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">
          {t('Remboursements partiels', 'Partial repayments', 'التسديدات الجزئية')}
        </p>
      </div>

      {/* Summary */}
      {totalAmount > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {t('Payé', 'Paid')}: <span className="font-semibold text-foreground">{fmt(totalPaid)} {currency}</span> ({paidPct.toFixed(0)}%)
            </span>
            <span className="text-muted-foreground">
              {t('Restant', 'Remaining')}: <span className="font-semibold text-gold">{fmt(remaining)} {currency}</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${paidPct}%` }} />
          </div>
          {daysLeft !== null && remaining > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {daysLeft >= 0
                ? t(`${daysLeft} jour(s) avant échéance`, `${daysLeft} day(s) until due date`)
                : t(`${Math.abs(daysLeft)} jour(s) de retard`, `${Math.abs(daysLeft)} day(s) overdue`)}
            </p>
          )}
        </div>
      )}

      {/* Payment list */}
      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : payments.length > 0 ? (
        <div className="space-y-1.5">
          {payments.map((p) => {
            const pct = totalAmount > 0 ? (p.amount / totalAmount) * 100 : 0;
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{fmt(p.amount)} {currency}</span>
                    <span className="text-muted-foreground">({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {format(new Date(p.paid_at), 'dd/MM/yyyy')}
                    {p.notes ? ` — ${p.notes}` : ''}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">
          {t('Aucun paiement enregistré', 'No payments recorded')}
        </p>
      )}

      {/* Add form */}
      <div className="space-y-2 border-t border-border/40 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t('Montant', 'Amount')}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0.00"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Date', 'Date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8 w-full justify-start text-xs font-normal', !newDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                  {newDate ? format(newDate, 'dd/MM/yyyy') : '—'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={newDate} onSelect={setNewDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Textarea
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          rows={1}
          placeholder={t('Note (optionnel)', 'Note (optional)')}
          className="text-xs"
        />
        <Button size="sm" onClick={handleAdd} disabled={saving || !debtId} className="w-full h-8 text-xs">
          {saving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plus className="mr-1.5 h-3 w-3" />}
          {t('Ajouter un paiement', 'Add payment')}
        </Button>
        {!debtId && (
          <p className="text-[11px] text-muted-foreground italic text-center">
            {t('Enregistrez la dette pour ajouter des paiements', 'Save the debt to add payments')}
          </p>
        )}
      </div>
    </div>
  );
}
