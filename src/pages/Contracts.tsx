import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { encrypt, decrypt, generateIv } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Loader2, Calendar, Users } from 'lucide-react';
import Layout from '@/components/Layout';
import ContractFormDialog, { type ContractFormData, type Attachment, TYPE_LABELS, type ContractType } from '@/components/contracts/ContractFormDialog';

interface ContractItem {
  id: string;
  contract_type: ContractType;
  iv: string;
  title: string;
  contract_date: string;
  parties: { name: string; role: string }[];
  execution_delay: string;
  clauses: string;
  penalties: string;
  witnesses: { name: string; contact: string }[];
  notes: string;
}

export default function Contracts() {
  const { user, passphrase, profile, language } = useAuth();
  const t = useTranslation(language);
  const { toast } = useToast();

  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContractItem | null>(null);
  const [editingAttachments, setEditingAttachments] = useState<Attachment[]>([]);

  const safeDecrypt = async (val: string | null, iv: string) => {
    if (!val || !passphrase || !profile?.encryption_salt) return '';
    try { return await decrypt(val, iv, passphrase, profile.encryption_salt); } catch { return ''; }
  };

  const loadContracts = useCallback(async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setLoading(true);
    const { data } = await supabase.from('contracts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
      const decrypted = await Promise.all(data.map(async (c: any) => {
        const [title, date, partiesStr, delay, clauses, penalties, witnessesStr, notes] = await Promise.all([
          safeDecrypt(c.title_encrypted, c.iv),
          safeDecrypt(c.contract_date_encrypted, c.iv),
          safeDecrypt(c.parties_encrypted, c.iv),
          safeDecrypt(c.execution_delay_encrypted, c.iv),
          safeDecrypt(c.clauses_encrypted, c.iv),
          safeDecrypt(c.penalties_encrypted, c.iv),
          safeDecrypt(c.witnesses_encrypted, c.iv),
          safeDecrypt(c.notes_encrypted, c.iv),
        ]);
        let parties: any[] = []; let witnesses: any[] = [];
        try { parties = partiesStr ? JSON.parse(partiesStr) : []; } catch {}
        try { witnesses = witnessesStr ? JSON.parse(witnessesStr) : []; } catch {}
        return { id: c.id, contract_type: c.contract_type, iv: c.iv, title, contract_date: date, parties, execution_delay: delay, clauses, penalties, witnesses, notes } as ContractItem;
      }));
      setContracts(decrypted);
    }
    setLoading(false);
  }, [user, passphrase, profile]);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const loadAttachments = async (contractId: string): Promise<Attachment[]> => {
    if (!user) return [];
    const { data } = await supabase.from('contract_attachments').select('*').eq('contract_id', contractId).order('created_at', { ascending: true });
    if (!data) return [];
    return await Promise.all(data.map(async (a: any) => {
      const { data: signed } = await supabase.storage.from('contract-attachments').createSignedUrl(a.file_path, 60 * 60);
      return { id: a.id, file_path: a.file_path, file_type: a.file_type, file_name: a.file_name, url: signed?.signedUrl };
    }));
  };

  const openCreate = () => { setEditing(null); setEditingAttachments([]); setFormOpen(true); };
  const openEdit = async (c: ContractItem) => {
    setEditing(c);
    setEditingAttachments(await loadAttachments(c.id));
    setFormOpen(true);
  };

  const handleSave = async (form: ContractFormData, newFiles: File[]) => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setSaving(true);
    try {
      const iv = editing?.iv || generateIv();
      const enc = async (txt: string) => (await encrypt(txt, passphrase, profile.encryption_salt!, iv)).ciphertext;
      const row = {
        user_id: user.id,
        contract_type: form.contract_type,
        iv,
        title_encrypted: await enc(form.title),
        contract_date_encrypted: form.contract_date ? await enc(form.contract_date) : null,
        parties_encrypted: form.parties.length ? await enc(JSON.stringify(form.parties)) : null,
        execution_delay_encrypted: form.execution_delay ? await enc(form.execution_delay) : null,
        clauses_encrypted: form.clauses ? await enc(form.clauses) : null,
        penalties_encrypted: form.penalties ? await enc(form.penalties) : null,
        witnesses_encrypted: form.witnesses.length ? await enc(JSON.stringify(form.witnesses)) : null,
        notes_encrypted: form.notes ? await enc(form.notes) : null,
      };

      let contractId = editing?.id;
      if (editing) {
        await supabase.from('contracts').update(row).eq('id', editing.id);
      } else {
        const { data: inserted, error } = await supabase.from('contracts').insert(row).select('id').single();
        if (error) throw error;
        contractId = inserted!.id;
      }

      // Upload new files
      if (contractId && newFiles.length) {
        for (const file of newFiles) {
          const ext = file.name.split('.').pop() || 'bin';
          const path = `${user.id}/${contractId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('contract-attachments').upload(path, file, { contentType: file.type });
          if (!upErr) {
            await supabase.from('contract_attachments').insert({
              contract_id: contractId, user_id: user.id,
              file_path: path, file_type: file.type || 'application/octet-stream', file_name: file.name,
            });
          }
        }
      }

      toast({ title: t('success') });
      setFormOpen(false); setEditing(null);
      await loadContracts();
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editing) return;
    // Remove storage files first
    const { data: atts } = await supabase.from('contract_attachments').select('file_path').eq('contract_id', editing.id);
    if (atts?.length) await supabase.storage.from('contract-attachments').remove(atts.map((a: any) => a.file_path));
    await supabase.from('contracts').delete().eq('id', editing.id);
    setFormOpen(false); setEditing(null);
    await loadContracts();
  };

  const handleDeleteAttachment = async (a: Attachment) => {
    await supabase.storage.from('contract-attachments').remove([a.file_path]);
    await supabase.from('contract_attachments').delete().eq('id', a.id);
    setEditingAttachments(editingAttachments.filter((x) => x.id !== a.id));
  };

  const titleLabel = language === 'fr' ? 'MES CONTRATS' : language === 'ar' ? 'عقودي' : 'MY CONTRACTS';
  const emptyLabel = language === 'fr' ? 'Aucun contrat' : language === 'ar' ? 'لا توجد عقود' : 'No contracts';

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in pb-28">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 px-5 pt-4 pb-4"
          style={{ background: 'linear-gradient(135deg, hsl(155 28% 26%) 0%, hsl(155 22% 22%) 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold/10 border border-gold/20">
                <FileText className="h-4 w-4 text-gold" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-gold-gradient uppercase tracking-wider">{titleLabel}</h1>
            </div>
            <Button size="sm" onClick={openCreate} className="bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">{emptyLabel}</div>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <button
                key={c.id}
                onClick={() => openEdit(c)}
                className="group w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gold/80 uppercase tracking-wide mb-1">{TYPE_LABELS[language][c.contract_type] || c.contract_type}</p>
                    <h3 className="font-semibold text-foreground truncate">{c.title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {c.contract_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.contract_date}</span>}
                      {c.parties.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.parties.length}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Floating add button */}
        <button
          onClick={openCreate}
          aria-label={language === 'fr' ? 'Ajouter un contrat' : 'Add contract'}
          className="lg:hidden fixed bottom-6 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gold text-background shadow-lg shadow-black/30 hover:bg-gold/90 active:scale-95 transition-all"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <ContractFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        language={language}
        isEditing={!!editing}
        saving={saving}
        attachments={editingAttachments}
        initial={editing ? {
          contract_type: editing.contract_type,
          title: editing.title,
          contract_date: editing.contract_date,
          parties: editing.parties,
          execution_delay: editing.execution_delay,
          clauses: editing.clauses,
          penalties: editing.penalties,
          witnesses: editing.witnesses,
          notes: editing.notes,
        } : undefined}
        onSave={handleSave}
        onDelete={editing ? handleDelete : undefined}
        onDeleteAttachment={handleDeleteAttachment}
      />
    </Layout>
  );
}
