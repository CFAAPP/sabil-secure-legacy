import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { encrypt, decrypt } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Check, Trash2, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';

interface DebtItem {
  id: string;
  debt_type: 'i_owe' | 'owed_to_me';
  description: string;
  amount: string;
  creditor_debtor: string;
  is_settled: boolean;
}

export default function Debts() {
  const { user, profile, passphrase, language } = useAuth();
  const t = useTranslation(language);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({ type: 'i_owe' as 'i_owe' | 'owed_to_me', description: '', amount: '', person: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDebts();
  }, [user, passphrase]);

  const loadDebts = async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setLoading(true);

    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const decrypted = await Promise.all(
        data.map(async (d: any) => {
          try {
            const [description, amount, creditor_debtor] = await Promise.all([
              decrypt(d.description_encrypted, d.iv, passphrase, profile.encryption_salt!),
              decrypt(d.amount_encrypted, d.iv, passphrase, profile.encryption_salt!),
              decrypt(d.creditor_debtor_encrypted, d.iv, passphrase, profile.encryption_salt!),
            ]);
            return { id: d.id, debt_type: d.debt_type, description, amount, creditor_debtor, is_settled: d.is_settled };
          } catch {
            return null;
          }
        })
      );
      setDebts(decrypted.filter(Boolean) as DebtItem[]);
    }
    setLoading(false);
  };

  const addDebt = async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setSaving(true);

    try {
      const { ciphertext: descEnc, iv } = await encrypt(newDebt.description, passphrase, profile.encryption_salt);
      const { ciphertext: amtEnc } = await encrypt(newDebt.amount, passphrase, profile.encryption_salt);
      const { ciphertext: personEnc } = await encrypt(newDebt.person, passphrase, profile.encryption_salt);

      await supabase.from('debts').insert({
        user_id: user.id,
        debt_type: newDebt.type,
        description_encrypted: descEnc,
        amount_encrypted: amtEnc,
        creditor_debtor_encrypted: personEnc,
        iv,
      } as any);

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'debt_created',
        entity_type: 'debts',
      } as any);

      setDialogOpen(false);
      setNewDebt({ type: 'i_owe', description: '', amount: '', person: '' });
      await loadDebts();
      toast({ title: t('success') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
    setSaving(false);
  };

  const toggleSettled = async (id: string, settled: boolean) => {
    await supabase.from('debts').update({ is_settled: !settled } as any).eq('id', id);
    await loadDebts();
  };

  const deleteDebt = async (id: string) => {
    await supabase.from('debts').delete().eq('id', id);
    await loadDebts();
  };

  const renderDebtList = (type: 'i_owe' | 'owed_to_me') => {
    const filtered = debts.filter((d) => d.debt_type === type);
    if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
    if (!filtered.length) return <p className="text-center text-sm text-muted-foreground py-8">{language === 'fr' ? 'Aucune dette' : 'No debts'}</p>;

    return (
      <div className="space-y-3">
        {filtered.map((debt) => (
          <Card key={debt.id} className={debt.is_settled ? 'opacity-60' : ''}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className={`font-medium text-sm ${debt.is_settled ? 'line-through' : ''}`}>{debt.description}</p>
                <p className="text-xs text-muted-foreground">{debt.creditor_debtor}</p>
              </div>
              <span className="font-medium text-sm">{debt.amount}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleSettled(debt.id, debt.is_settled)}>
                  <Check className={`h-4 w-4 ${debt.is_settled ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteDebt(debt.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-sabeel-gold" />
            <h1 className="font-serif text-2xl font-bold">{t('debtsTitle')}</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />{t('addDebt')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">{t('addDebt')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={newDebt.type === 'i_owe' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewDebt({ ...newDebt, type: 'i_owe' })}
                  >{t('iOwe')}</Button>
                  <Button
                    variant={newDebt.type === 'owed_to_me' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewDebt({ ...newDebt, type: 'owed_to_me' })}
                  >{t('owedToMe')}</Button>
                </div>
                <div className="space-y-2">
                  <Label>{t('description')}</Label>
                  <Input value={newDebt.description} onChange={(e) => setNewDebt({ ...newDebt, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('amount')}</Label>
                  <Input value={newDebt.amount} onChange={(e) => setNewDebt({ ...newDebt, amount: e.target.value })} placeholder="1000€" />
                </div>
                <div className="space-y-2">
                  <Label>{t('creditorDebtor')}</Label>
                  <Input value={newDebt.person} onChange={(e) => setNewDebt({ ...newDebt, person: e.target.value })} />
                </div>
                <Button onClick={addDebt} className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('confirm')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="i_owe">
          <TabsList className="w-full">
            <TabsTrigger value="i_owe" className="flex-1">{t('iOwe')}</TabsTrigger>
            <TabsTrigger value="owed_to_me" className="flex-1">{t('owedToMe')}</TabsTrigger>
          </TabsList>
          <TabsContent value="i_owe">{renderDebtList('i_owe')}</TabsContent>
          <TabsContent value="owed_to_me">{renderDebtList('owed_to_me')}</TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center">
          🔒 {language === 'fr' ? 'Chiffré de bout en bout — AES-256-GCM' : 'End-to-end encrypted — AES-256-GCM'}
        </p>
      </div>
    </Layout>
  );
}
