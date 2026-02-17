import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { encrypt, decrypt, generateIv } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Settings, Loader2, AlertTriangle } from 'lucide-react';
import Layout from '@/components/Layout';
import DebtCard, { type DebtItem } from '@/components/debts/DebtCard';
import DebtFormDialog from '@/components/debts/DebtFormDialog';
import ReminderSettingsDialog, { type ReminderSettingsData } from '@/components/debts/ReminderSettingsDialog';
import SendReminderDialog from '@/components/debts/SendReminderDialog';
import ShareDebtDialog from '@/components/debts/ShareDebtDialog';
import { format } from 'date-fns';

const DEFAULT_REMINDER_SETTINGS: ReminderSettingsData = {
  frequency: 'monthly', custom_days: 30, enabled: true,
};

export default function Debts() {
  const { user, profile, passphrase, language } = useAuth();
  const t = useTranslation(language);
  const { toast } = useToast();

  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);

  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettingsData>(DEFAULT_REMINDER_SETTINGS);
  const [reminderSaving, setReminderSaving] = useState(false);

  const [reminderDebt, setReminderDebt] = useState<DebtItem | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const [shareDebt, setShareDebt] = useState<DebtItem | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const [showBanner, setShowBanner] = useState(false);

  // Load debts
  const loadDebts = useCallback(async () => {
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
            const [name, amount, currency, dueDate, notes, creditorEmail, creditorPhone] = await Promise.all([
              decrypt(d.creditor_debtor_encrypted, d.iv, passphrase, profile.encryption_salt!),
              decrypt(d.amount_encrypted, d.iv, passphrase, profile.encryption_salt!),
              d.currency_encrypted ? decrypt(d.currency_encrypted, d.iv, passphrase, profile.encryption_salt!) : Promise.resolve('EUR'),
              d.due_date_encrypted ? decrypt(d.due_date_encrypted, d.iv, passphrase, profile.encryption_salt!) : Promise.resolve(null),
              d.notes_encrypted ? decrypt(d.notes_encrypted, d.iv, passphrase, profile.encryption_salt!) : Promise.resolve(null),
              d.creditor_email_encrypted ? decrypt(d.creditor_email_encrypted, d.iv, passphrase, profile.encryption_salt!) : Promise.resolve(null),
              d.creditor_phone_encrypted ? decrypt(d.creditor_phone_encrypted, d.iv, passphrase, profile.encryption_salt!) : Promise.resolve(null),
            ]);
            return {
              id: d.id,
              debt_type: d.debt_type as 'i_owe' | 'owed_to_me',
              name,
              amount,
              currency,
              due_date: dueDate,
              status: (d.status || (d.is_settled ? 'paid' : 'pending')) as 'pending' | 'paid',
              notes,
              creditor_email: creditorEmail || null,
              creditor_phone: creditorPhone || null,
            };
          } catch {
            return null;
          }
        })
      );
      setDebts(decrypted.filter(Boolean) as DebtItem[]);
    }
    setLoading(false);
  }, [user, passphrase, profile]);

  // Load reminder settings from vault
  const loadReminderSettings = useCallback(async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    const { data } = await supabase
      .from('vault_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', 'debt_reminder_settings')
      .maybeSingle();

    if (data) {
      try {
        const json = await decrypt(data.content_encrypted, data.iv, passphrase, profile.encryption_salt!);
        setReminderSettings(JSON.parse(json));
      } catch { /* use defaults */ }
    }
  }, [user, passphrase, profile]);

  useEffect(() => {
    loadDebts();
    loadReminderSettings();
  }, [loadDebts, loadReminderSettings]);

  // Check if banner should show
  useEffect(() => {
    if (!reminderSettings.enabled || reminderSettings.frequency === 'off') {
      setShowBanner(false);
      return;
    }
    // Simple: show banner if enabled (real scheduling would use stored last_shown timestamp)
    setShowBanner(true);
  }, [reminderSettings]);

  // Save debt
  const handleSaveDebt = async (formData: any) => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setSaving(true);
    try {
      const iv = generateIv();
      const { ciphertext: nameEnc } = await encrypt(formData.name, passphrase, profile.encryption_salt, iv);
      const { ciphertext: amtEnc } = await encrypt(formData.amount, passphrase, profile.encryption_salt, iv);
      const { ciphertext: currEnc } = await encrypt(formData.currency, passphrase, profile.encryption_salt, iv);
      const dueDateStr = formData.hasDueDate && formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : '';
      const { ciphertext: dueDateEnc } = await encrypt(dueDateStr, passphrase, profile.encryption_salt, iv);
      const { ciphertext: notesEnc } = await encrypt(formData.notes || '', passphrase, profile.encryption_salt, iv);
      const { ciphertext: credEmailEnc } = await encrypt(formData.creditorEmail || '', passphrase, profile.encryption_salt, iv);
      const { ciphertext: credPhoneEnc } = await encrypt(formData.creditorPhone || '', passphrase, profile.encryption_salt, iv);

      // If debtor marks "i_owe" as paid and creditor email exists, require approval
      const needsApproval = formData.type === 'i_owe' && formData.status === 'paid' && formData.creditorEmail &&
        editingDebt && editingDebt.status !== 'paid';

      const row = {
        user_id: user.id,
        debt_type: formData.type,
        creditor_debtor_encrypted: nameEnc,
        amount_encrypted: amtEnc,
        currency_encrypted: currEnc,
        due_date_encrypted: dueDateStr ? dueDateEnc : null,
        notes_encrypted: formData.notes ? notesEnc : null,
        creditor_email_encrypted: formData.creditorEmail ? credEmailEnc : null,
        creditor_phone_encrypted: formData.creditorPhone ? credPhoneEnc : null,
        description_encrypted: nameEnc, // legacy compat
        iv,
        status: needsApproval ? 'pending' : formData.status,
        is_settled: needsApproval ? false : formData.status === 'paid',
      } as any;

      let debtId = editingDebt?.id;
      if (editingDebt) {
        await supabase.from('debts').update(row).eq('id', editingDebt.id);
      } else {
        const { data: inserted } = await supabase.from('debts').insert(row).select('id').single();
        debtId = inserted?.id;
      }

      await supabase.from('audit_logs').insert({ user_id: user.id, action: editingDebt ? 'debt_updated' : 'debt_created', entity_type: 'debts' } as any);

      // If needs approval, create share link + modification request + send email
      if (needsApproval && debtId) {
        const { data: shareLink } = await supabase
          .from('debt_share_links')
          .insert({
            debt_id: debtId,
            user_id: user.id,
            debtor_visible_name: formData.name,
            debtor_visible_amount: formData.amount,
            debtor_visible_currency: formData.currency,
            debtor_visible_due_date: dueDateStr || null,
            creditor_email: formData.creditorEmail,
          } as any)
          .select()
          .single();

        if (shareLink) {
          const { data: modReq } = await supabase
            .from('debt_modification_requests')
            .insert({
              share_link_id: shareLink.id,
              debt_id: debtId,
              proposed_status: 'paid',
              debtor_message: language === 'fr' ? 'Le débiteur a marqué cette dette comme payée.' : 'The debtor marked this debt as paid.',
            } as any)
            .select()
            .single();

          if (modReq) {
            await supabase.functions.invoke('send-approval-email', {
              body: { modification_request_id: modReq.id, app_url: window.location.origin },
            });
          }
        }

        toast({ title: language === 'fr' ? 'Demande de validation envoyée au créancier' : 'Validation request sent to creditor' });
      } else {
        toast({ title: t('success') });
      }

      setFormOpen(false);
      setEditingDebt(null);
      await loadDebts();
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDeleteDebt = async (id: string) => {
    await supabase.from('debts').delete().eq('id', id);
    setFormOpen(false);
    setEditingDebt(null);
    await loadDebts();
  };

  // Save reminder settings to vault
  const handleSaveReminderSettings = async (data: ReminderSettingsData) => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setReminderSaving(true);
    try {
      const json = JSON.stringify(data);
      const { ciphertext, iv } = await encrypt(json, passphrase, profile.encryption_salt);
      const { ciphertext: titleEnc } = await encrypt('debt_reminder_settings', passphrase, profile.encryption_salt);

      const existing = await supabase.from('vault_items').select('id').eq('user_id', user.id).eq('item_type', 'debt_reminder_settings').maybeSingle();

      const row = {
        user_id: user.id,
        item_type: 'debt_reminder_settings',
        title_encrypted: titleEnc,
        content_encrypted: ciphertext,
        iv,
      };

      if (existing.data) {
        await supabase.from('vault_items').update(row as any).eq('id', existing.data.id);
      } else {
        await supabase.from('vault_items').insert(row as any);
      }

      setReminderSettings(data);
      setReminderSettingsOpen(false);
      toast({ title: t('success') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
    setReminderSaving(false);
  };

  const openDetails = (debt: DebtItem) => {
    setEditingDebt(debt);
    setFormOpen(true);
  };

  const openReminder = (debt: DebtItem) => {
    setReminderDebt(debt);
    setReminderDialogOpen(true);
  };

  const openShare = (debt: DebtItem) => {
    setShareDebt(debt);
    setShareDialogOpen(true);
  };

  const renderDebtList = (type: 'i_owe' | 'owed_to_me') => {
    const filtered = debts.filter((d) => d.debt_type === type);
    if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
    if (!filtered.length) return <p className="text-center text-sm text-muted-foreground py-8">{t('noDebts')}</p>;
    return (
      <div className="space-y-3">
        {filtered.map((debt) => (
          <DebtCard key={debt.id} debt={debt} language={language} onDetails={openDetails} onRemind={openReminder} onShare={openShare} />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-sabeel-gold" />
            <h1 className="font-serif text-2xl font-bold">{t('debtsTitle')}</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReminderSettingsOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Reminder banner */}
        {showBanner && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
            <span>{t('reminderBanner')}</span>
            <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => setShowBanner(false)}>✕</Button>
          </div>
        )}

        {/* Tabs */}
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

        {/* Floating add button */}
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-30"
          size="icon"
          onClick={() => { setEditingDebt(null); setFormOpen(true); }}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Dialogs */}
        <DebtFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          language={language}
          editingDebt={editingDebt}
          onSave={handleSaveDebt}
          onDelete={handleDeleteDebt}
          saving={saving}
          userId={user?.id}
        />
        <ReminderSettingsDialog
          open={reminderSettingsOpen}
          onOpenChange={setReminderSettingsOpen}
          language={language}
          settings={reminderSettings}
          onSave={handleSaveReminderSettings}
          saving={reminderSaving}
        />
        <SendReminderDialog
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
          language={language}
          debt={reminderDebt}
        />
        <ShareDebtDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          language={language}
          debt={shareDebt}
        />
      </div>
    </Layout>
  );
}
