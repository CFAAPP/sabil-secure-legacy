import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { encrypt, decrypt } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Save, FileText, Loader2, ChevronDown, ChevronUp, Plus, Trash2,
  MessageSquare, Scale, ShieldCheck, Mail,
  ExternalLink, AlertCircle, Info, Lock, Calendar, FileDown
} from 'lucide-react';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Layout from '@/components/Layout';
import { Link } from 'react-router-dom';
import { EMPTY_IDENTITY, getFamilyIdentity, loadLatestFamilyProfile } from '@/lib/familyProfile';
const uuidv4 = () => crypto.randomUUID();

// ─── Types ────────────────────────────────────────────────────────────────────

type BeneficiaryCategory = 'non_heir' | 'legal_heir';

interface WasiyyaBeneficiary {
  id: string;
  beneficiary: string;
  category: BeneficiaryCategory;
  requires_heir_consent: boolean;
  type: 'percentage' | 'amount';
  value: number;
  notes: string;
}

interface TestamentWitness {
  id: string;
  name: string;
  email: string;
  phone: string;
  notified_at?: string | null;
}

interface PersonalMessage {
  id: string;
  recipient: string;
  title: string;
  content: string;
  visible_post_death: boolean;
}

interface TestamentData {
  funeral_wishes: string;
  additional_debts: string;
  wasiyya: WasiyyaBeneficiary[];
  witnesses: TestamentWitness[];
  personal_messages: PersonalMessage[];
}

const DEFAULT_DATA: TestamentData = {
  funeral_wishes: '',
  additional_debts: '',
  wasiyya: [],
  witnesses: [],
  personal_messages: [],
};


// ─── Section collapse helper ──────────────────────────────────────────────────

function Section({
  title, icon, children, defaultOpen = true
}: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden border border-border/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20">
            {icon}
          </div>
          <span className="font-semibold text-sm text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border/40">{children}</div>}
    </Card>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-muted/40 border border-border/40 px-3 py-3 text-xs text-muted-foreground leading-relaxed">
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
      <div>{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Testament() {
  const { user, profile, passphrase, language } = useAuth();
  const t = useTranslation(language);
  const [data, setData] = useState<TestamentData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notifying, setNotifying] = useState<string | null>(null);

  const [existingId, setExistingId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [identity, setIdentity] = useState(EMPTY_IDENTITY);
  const { toast } = useToast();

  // Tri-language helper
  const tx = (fr: string, en: string, ar: string) =>
    language === 'ar' ? ar : language === 'en' ? en : fr;

  const dateFmt = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR';

  // ─── Load ────────────────────────────────────────────────────────────────

  useEffect(() => { loadTestament(); }, [user, passphrase]);

  const loadTestament = async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setLoading(true);

    const { data: row } = await supabase
      .from('vault_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', 'testament')
      .maybeSingle();

    if (row) {
      try {
        const decrypted = await decrypt(
          (row as any).content_encrypted,
          (row as any).iv,
          passphrase,
          profile.encryption_salt
        );
        const parsed: TestamentData = JSON.parse(decrypted);
        setData({ ...DEFAULT_DATA, ...parsed });
        setExistingId(row.id);
        setCreatedAt((row as any).created_at);
        setUpdatedAt((row as any).updated_at);
      } catch {
        toast({ title: t('error'), description: tx('Phrase secrète incorrecte.', 'Incorrect passphrase.', 'عبارة المرور غير صحيحة.'), variant: 'destructive' });
      }
    }

    // Load family profile for identity
    try {
      const latest = await loadLatestFamilyProfile(user.id, passphrase, profile.encryption_salt);
      setIdentity(getFamilyIdentity(latest?.data));
    } catch { /* ignore */ }

    setLoading(false);
  };


  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;

    // Validate wasiyya total
    const totalPct = data.wasiyya.filter(b => b.type === 'percentage').reduce((s, b) => s + (b.value || 0), 0);
    if (totalPct > 33.33) {
      toast({ title: t('error'), description: tx('La wasiyya ne peut pas dépasser un tiers des biens (33,33%).', 'Wasiyya cannot exceed one third (33.33%).', 'لا يمكن أن تتجاوز الوصية ثلث الأموال (٣٣٫٣٣٪).'), variant: 'destructive' });
      return;
    }

    // Legal heirs require an explicit consent acknowledgement
    if (data.wasiyya.some(b => b.category === 'legal_heir' && !b.requires_heir_consent)) {
      toast({
        title: t('error'),
        description: tx(
          "Un bénéficiaire est un héritier légal : cochez la case de consentement conditionnel pour pouvoir enregistrer.",
          'A beneficiary is a legal heir: tick the conditional consent box to save.',
          'أحد المستفيدين وارث شرعي: يجب تأكيد شرط موافقة الورثة قبل الحفظ.'
        ),
        variant: 'destructive',
      });
      return;
    }



    setSaving(true);
    try {
      const jsonStr = JSON.stringify(data);
      const { ciphertext, iv } = await encrypt(jsonStr, passphrase, profile.encryption_salt);

      if (existingId) {
        await supabase.from('vault_items').update({
          content_encrypted: ciphertext,
          title_encrypted: 'testament',
          iv,
        } as any).eq('id', existingId);
      } else {
        const { data: inserted } = await supabase.from('vault_items').insert({
          user_id: user.id,
          item_type: 'testament',
          content_encrypted: ciphertext,
          title_encrypted: 'testament',
          iv,
        } as any).select().single();
        if (inserted) {
          setExistingId(inserted.id);
          setCreatedAt((inserted as any).created_at);
        }
      }

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: existingId ? 'testament_updated' : 'testament_created',
        entity_type: 'vault_items',
        entity_id: existingId,
      } as any);

      setUpdatedAt(new Date().toISOString());
      toast({ title: t('success'), description: t('saved') });
    } catch {
      toast({ title: t('error'), description: tx('Erreur lors de la sauvegarde.', 'Save failed.', 'فشل الحفظ.'), variant: 'destructive' });
    }
    setSaving(false);
  };

  // ─── Wasiyya helpers ──────────────────────────────────────────────────────

  const totalWasiyya = data.wasiyya.filter(b => b.type === 'percentage').reduce((s, b) => s + (b.value || 0), 0);
  const wasiyyaExceeds = totalWasiyya > 33.33;

  const addBeneficiary = () => {
    setData(d => ({
      ...d,
      wasiyya: [...d.wasiyya, { id: uuidv4(), beneficiary: '', category: 'non_heir', requires_heir_consent: false, type: 'percentage', value: 0, notes: '' }]
    }));
  };

  const updateBeneficiary = (id: string, field: keyof WasiyyaBeneficiary, value: any) => {
    setData(d => ({
      ...d,
      wasiyya: d.wasiyya.map(b => {
        if (b.id !== id) return b;
        const next = { ...b, [field]: value } as WasiyyaBeneficiary;
        if (field === 'category' && value === 'non_heir') next.requires_heir_consent = false;
        return next;
      }),
    }));
  };

  const removeBeneficiary = (id: string) => {
    setData(d => ({ ...d, wasiyya: d.wasiyya.filter(b => b.id !== id) }));
  };

  // ─── Witness helpers ──────────────────────────────────────────────────────

  const addWitness = () => {
    setData(d => d.witnesses.length >= 2 ? d : ({
      ...d,
      witnesses: [...d.witnesses, { id: uuidv4(), name: '', email: '', phone: '', notified_at: null }],
    }));
  };

  const updateWitness = (id: string, field: keyof TestamentWitness, value: any) => {
    setData(d => ({ ...d, witnesses: d.witnesses.map(w => w.id === id ? { ...w, [field]: value } : w) }));
  };

  const removeWitness = (id: string) => {
    setData(d => ({ ...d, witnesses: d.witnesses.filter(w => w.id !== id) }));
  };

  const isWitnessAlsoBeneficiary = (name: string) => {
    const n = name.trim().toLowerCase();
    if (!n) return false;
    return data.wasiyya.some(b => b.beneficiary.trim().toLowerCase() === n);
  };

  const notifyWitness = async (w: TestamentWitness) => {
    if (!w.email.trim() || !user) return;
    setNotifying(w.id);
    try {
      const testatorName = `${identity.first_name} ${identity.last_name}`.trim() || profile?.display_name || '';
      const { error } = await supabase.functions.invoke('send-testament-witness-notice', {
        body: {
          witnessName: w.name,
          witnessEmail: w.email,
          testatorName,
          depositDate: (updatedAt || createdAt || new Date().toISOString()).slice(0, 10),
          language,
        },
      });
      if (error) throw error;
      updateWitness(w.id, 'notified_at', new Date().toISOString());
      toast({ title: t('success'), description: tx('Témoin notifié par email.', 'Witness notified by email.', 'تم إشعار الشاهد بالبريد الإلكتروني.') });
    } catch {
      toast({ title: t('error'), description: tx("Échec de l'envoi de la notification.", 'Notification failed.', 'فشل إرسال الإشعار.'), variant: 'destructive' });
    }
    setNotifying(null);
  };


  // ─── Personal messages helpers ────────────────────────────────────────────

  const addMessage = () => {
    setData(d => ({
      ...d,
      personal_messages: [...d.personal_messages, { id: uuidv4(), recipient: '', title: '', content: '', visible_post_death: true }]
    }));
  };

  const updateMessage = (id: string, field: keyof PersonalMessage, value: any) => {
    setData(d => ({ ...d, personal_messages: d.personal_messages.map(m => m.id === id ? { ...m, [field]: value } : m) }));
  };

  const removeMessage = (id: string) => {
    setData(d => ({ ...d, personal_messages: d.personal_messages.filter(m => m.id !== id) }));
  };

  // ─── Declaration builder ─────────────────────────────────────────────────

  const buildDeclaration = () => {
    const { first_name, last_name, gender, birth_date, father_first_name } = identity;
    const fullName = `${first_name} ${last_name}`.trim() || '—';
    const birthStr = birth_date ? new Date(birth_date).toLocaleDateString(dateFmt) : '—';
    const dateStr = new Date().toLocaleDateString(dateFmt);
    const father = father_first_name || '—';
    const isFemale = gender === 'female';
    const soussigne = tx(isFemale ? 'soussignée' : 'soussigné', 'undersigned', isFemale ? 'الموقّعة أدناه' : 'الموقّع أدناه');
    const fils = tx(isFemale ? 'fille' : 'fils', isFemale ? 'daughter' : 'son', isFemale ? 'ابنة' : 'ابن');
    const ne = tx(isFemale ? 'née' : 'né', 'born', isFemale ? 'المولودة' : 'المولود');

    return tx(
      `Je ${soussigne}, ${fullName}, ${fils} de ${father}, ${ne} le ${birthStr}, sain(e) d'esprit et de corps, déclare en ce ${dateStr}, en pleine conscience et dans le respect de la foi islamique, que ceci constitue ma wasiyya (testament). J'atteste qu'il n'y a rien de digne d'être adoré qu'Allah et que Muhammad ﷺ est Son Messager.`,
      `I, the ${soussigne} ${fullName}, ${fils} of ${father}, ${ne} on ${birthStr}, of sound mind and body, hereby declare on ${dateStr}, in full consciousness and in accordance with Islamic faith, that this constitutes my wasiyya (will). I bear witness that there is nothing worthy of worship but Allah and that Muhammad ﷺ is His Messenger.`,
      `أنا ${soussigne}، ${fullName}، ${fils} ${father}، ${ne} في ${birthStr}، بكامل قواي العقلية والجسدية، أُعلن في هذا اليوم ${dateStr}، بكامل وعيي ووفقاً للشريعة الإسلامية، أن هذه وصيتي. أشهد أن لا إله إلا الله وأن محمداً ﷺ رسول الله.`
    );
  };

  // ─── Export PDF ───────────────────────────────────────────────────────────

  const exportPDF = async () => {
    setExporting(true);
    try {
      const isAr = language === 'ar';
      const container = document.createElement('div');
      container.style.cssText = `position:fixed;left:-10000px;top:0;width:794px;padding:48px;background:#ffffff;color:#1a1a1a;font-family:${isAr ? "'Amiri', 'Times New Roman', serif" : "'Helvetica Neue', Arial, sans-serif"};font-size:13px;line-height:1.6;direction:${isAr ? 'rtl' : 'ltr'};`;

      const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
      const gold = '#b8935a';

      const dateStr = new Date().toLocaleDateString(dateFmt);
      const createdStr = createdAt ? new Date(createdAt).toLocaleDateString(dateFmt) : '—';
      const updatedStr = updatedAt ? new Date(updatedAt).toLocaleDateString(dateFmt) : '—';
      const fullName = `${identity.first_name} ${identity.last_name}`.trim() || profile?.display_name || '—';
      const declaration = buildDeclaration();

      const wasiyyaRows = data.wasiyya.length
        ? data.wasiyya.map(b => `<tr>
            <td style="padding:8px;border:1px solid #e5e5e5">${esc(b.beneficiary) || '—'}</td>
            <td style="padding:8px;border:1px solid #e5e5e5;text-align:center">${b.type === 'percentage' ? `${b.value}%` : b.value}</td>
            <td style="padding:8px;border:1px solid #e5e5e5">${esc(b.notes)}</td>
          </tr>`).join('')
        : `<tr><td colspan="3" style="padding:12px;border:1px solid #e5e5e5;text-align:center;color:#888">${tx('Aucun bénéficiaire', 'No beneficiaries', 'لا يوجد مستفيدون')}</td></tr>`;

      const messagesHtml = data.personal_messages.length
        ? data.personal_messages.map(m => `<div style="margin:12px 0;padding:12px;border:1px solid #e5e5e5;border-radius:6px;background:#fafafa">
            <div style="font-weight:600;margin-bottom:4px">${esc(m.recipient) || '—'} — ${esc(m.title)}</div>
            <div style="color:#444">${esc(m.content)}</div>
            <div style="font-size:11px;color:#888;margin-top:6px">${m.visible_post_death ? tx('Visible après décès', 'Visible after death', 'مرئي بعد الوفاة') : tx('Visible immédiatement', 'Visible immediately', 'مرئي فورا')}</div>
          </div>`).join('')
        : `<p style="color:#888;font-style:italic">${tx('Aucun message', 'No messages', 'لا توجد رسائل')}</p>`;

      const sec = (n: string, title: string, body: string) => `
        <div style="margin-top:24px;page-break-inside:avoid">
          <h2 style="font-size:16px;color:${gold};border-bottom:2px solid ${gold};padding-bottom:6px;margin:0 0 12px">${n} ${title}</h2>
          ${body}
        </div>`;

      container.innerHTML = `
        <div style="text-align:center;border-bottom:3px double ${gold};padding-bottom:20px;margin-bottom:24px">
          <div style="font-size:20px;color:${gold};margin-bottom:8px">﷽</div>
          <h1 style="font-size:26px;margin:0;letter-spacing:1px">${tx('MON TESTAMENT', 'MY WILL', 'وصيتي')}</h1>
          <div style="margin-top:10px;font-size:13px;color:#555">${esc(fullName)}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">
            ${tx('Créé le', 'Created', 'أُنشئ في')}: ${createdStr} · ${tx('Modifié le', 'Updated', 'عُدّل في')}: ${updatedStr} · ${tx('Exporté le', 'Exported', 'صُدّر في')}: ${dateStr}
          </div>
        </div>

        ${sec('①', tx('Déclaration', 'Declaration', 'الإعلان'),
          `<p style="font-style:italic;border-${isAr ? 'right' : 'left'}:3px solid ${gold};padding-${isAr ? 'right' : 'left'}:12px;color:#333">${esc(declaration)}</p>`)}

        ${sec('②', tx('Souhaits funéraires', 'Funeral Wishes', 'رغبات الجنازة'),
          `<div style="white-space:pre-wrap">${esc(data.funeral_wishes) || `<span style="color:#888;font-style:italic">${tx('Non renseigné', 'Not specified', 'غير محدد')}</span>`}</div>`)}

        ${sec('③', tx('Dettes & Obligations', 'Debts & Obligations', 'الديون والالتزامات'),
          `<div style="white-space:pre-wrap">${esc(data.additional_debts) || `<span style="color:#888;font-style:italic">${tx('Aucune dette additionnelle renseignée', 'No additional debts', 'لا توجد ديون إضافية')}</span>`}</div>`)}

        ${sec('④', tx('Wasiyya (max. 1/3)', 'Wasiyya (max. 1/3)', 'الوصية (الحد الأقصى ١/٣)'),
          `<div style="margin-bottom:8px;font-size:12px;color:#555">${tx('Total', 'Total', 'المجموع')}: <strong>${totalWasiyya.toFixed(2)}%</strong></div>
           <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:#f5f0e6">
              <th style="padding:8px;border:1px solid #e5e5e5;text-align:${isAr ? 'right' : 'left'}">${tx('Bénéficiaire', 'Beneficiary', 'المستفيد')}</th>
              <th style="padding:8px;border:1px solid #e5e5e5">${tx('Part', 'Share', 'الحصة')}</th>
              <th style="padding:8px;border:1px solid #e5e5e5;text-align:${isAr ? 'right' : 'left'}">${tx('Notes', 'Notes', 'ملاحظات')}</th>
            </tr></thead>
            <tbody>${wasiyyaRows}</tbody>
           </table>`)}

        ${sec('⑤', tx('Messages personnalisés', 'Personal Messages', 'رسائل شخصية'), messagesHtml)}

        <div style="margin-top:40px;padding-top:16px;border-top:1px solid #ddd;font-size:10px;color:#999;text-align:center">
          Mirath — ${tx('Document généré pour usage personnel', 'Document generated for personal use', 'وثيقة تم إنشاؤها للاستخدام الشخصي')}
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      document.body.removeChild(container);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      pdf.save(`testament-${(profile?.display_name?.replace(/\s+/g, '-') || 'mirath').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'testament_exported_pdf',
          entity_type: 'vault_items',
          entity_id: existingId,
        } as any);
      }

      toast({ title: t('success'), description: tx('PDF exporté', 'PDF exported', 'تم تصدير PDF') });
    } catch (e) {
      console.error(e);
      toast({ title: t('error'), description: tx("Échec de l'export PDF", 'PDF export failed', 'فشل تصدير PDF'), variant: 'destructive' });
    }
    setExporting(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────


  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in pb-24">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-4 py-4 flex items-center justify-between gap-3">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-2xl bg-primary/15 border border-primary/20">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <h1 className="font-display text-base sm:text-lg md:text-xl font-bold text-foreground uppercase tracking-wide whitespace-nowrap truncate">
              {tx('Mon Testament', 'My Will', 'وصيتي')}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={exportPDF}
              disabled={exporting || loading}
              variant="outline"
              className="h-9 w-9 sm:w-auto sm:gap-2 border-primary/30 text-primary hover:bg-primary/5 px-0 sm:px-3"
              aria-label={tx('Exporter PDF', 'Export PDF', 'تصدير PDF')}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline text-xs font-medium">{exporting ? tx('Export…', 'Export…', 'تصدير…') : 'PDF'}</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || wasiyyaExceeds}
              className="h-9 w-9 sm:w-auto sm:gap-2 px-0 sm:px-3"
              aria-label={saving ? t('saving') : t('save')}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline text-primary-foreground text-xs font-medium">{saving ? t('saving') : t('save')}</span>
            </Button>
          </div>
        </div>


        {/* ① Déclaration */}
        <Section
          title={tx('① الإعلان', '① Declaration', '① الإعلان').replace('① الإعلان', tx('① Déclaration', '① Declaration', '① الإعلان'))}
          icon={<Lock className="h-3.5 w-3.5 text-primary" />}
          defaultOpen={true}
        >
          <div className="p-5 space-y-3">
            <p className="text-center text-lg font-arabic text-primary/80">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 italic">
              {buildDeclaration()}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {tx('Créé le', 'Created', 'أُنشئ في')}: {createdAt ? new Date(createdAt).toLocaleDateString(dateFmt) : '—'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {tx('Modifié le', 'Updated', 'عُدّل في')}: {updatedAt ? new Date(updatedAt).toLocaleDateString(dateFmt) : '—'}
              </span>
            </div>
          </div>
        </Section>

        {/* ② Souhaits funéraires */}
        <Section
          title={tx('② Souhaits funéraires', '② Funeral Wishes', '② رغبات الجنازة')}
          icon={<FileText className="h-3.5 w-3.5 text-primary" />}
        >
          <div className="p-5 space-y-4">
            <Textarea
              value={data.funeral_wishes}
              onChange={(e) => setData(d => ({ ...d, funeral_wishes: e.target.value }))}
              placeholder={tx('Mes souhaits funéraires...', 'My funeral wishes...', 'رغباتي للجنازة...')}
              className="min-h-[120px] text-sm bg-muted/20 border-border/50 resize-none"
            />
            <InfoBox>
              <p className="font-medium text-sm mb-1.5">{tx('Sunnah à respecter :', 'Sunnah to follow:', 'من السنة:')}</p>
              <ul className="space-y-1 list-disc list-inside text-sm">
                {language === 'ar' ? (
                  <>
                    <li>دفن بسيط وسريع</li>
                    <li>عدم قراءة الفاتحة أو القرآن على القبر</li>
                    <li>عدم النياحة المفرطة</li>
                    <li>الدعاء: <span className="font-arabic">اللهم اغفر له وارحمه</span></li>
                  </>
                ) : language === 'en' ? (
                  <>
                    <li>Simple and quick burial</li>
                    <li>No recitation of Al-Fatiha or Quran over the grave</li>
                    <li>No excessive lamentations</li>
                    <li>Supplicate: <span className="font-arabic">اللهم اغفر له وارحمه</span></li>
                  </>
                ) : (
                  <>
                    <li>Enterrement simple et rapide</li>
                    <li>Pas de lecture de la Fatiha ou du Coran sur la tombe</li>
                    <li>Pas de lamentations excessives</li>
                    <li>Faire des invocations : <span className="font-arabic">اللهم اغفر له وارحمه</span></li>
                  </>
                )}
              </ul>
            </InfoBox>
          </div>
        </Section>

        {/* ③ Dettes & Obligations */}
        <Section
          title={tx('③ Dettes & Obligations', '③ Debts & Obligations', '③ الديون والالتزامات')}
          icon={<AlertCircle className="h-3.5 w-3.5 text-primary" />}
        >
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-xs text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{tx(
                'Les dettes doivent être réglées avant toute distribution de l\'héritage.',
                'Debts must be settled before any inheritance distribution.',
                'يجب تسديد الديون قبل أي توزيع للميراث.'
              )}</span>
            </div>
            <Link to="/debts">
              <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
                <ExternalLink className="h-3.5 w-3.5" />
                {tx('Voir mes dettes', 'View my debts', 'عرض ديوني')}
              </Button>
            </Link>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                {tx('Autres dettes ou obligations éventuelles', 'Other debts or obligations', 'ديون أو التزامات أخرى')}
              </label>
              <Textarea
                value={data.additional_debts}
                onChange={(e) => setData(d => ({ ...d, additional_debts: e.target.value }))}
                placeholder={tx('Dettes non enregistrées, obligations morales...', 'Unregistered debts, moral obligations...', 'ديون غير مسجلة، التزامات أخلاقية...')}
                className="min-h-[80px] text-sm bg-muted/20 border-border/50 resize-none"
              />
            </div>
          </div>
        </Section>

        {/* ④ Wasiyya */}
        <Section
          title={tx('④ Wasiyya (max. 1/3)', '④ Wasiyya (max. 1/3)', '④ الوصية (الحد الأقصى ١/٣)')}
          icon={<Users className="h-3.5 w-3.5 text-primary" />}
        >
          <div className="p-5 space-y-4">
            {/* Counter */}
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${wasiyyaExceeds ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted/30 border-border/40 text-muted-foreground'}`}>
              <span>{tx('Total utilisé :', 'Total used:', 'المجموع المستخدم:')} <strong>{totalWasiyya.toFixed(2)}%</strong></span>
              <span>{tx('Maximum : 33,33%', 'Maximum: 33.33%', 'الحد الأقصى: ٣٣٫٣٣٪')}</span>
            </div>
            {wasiyyaExceeds && (
              <div className="flex gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {tx('La wasiyya ne peut pas dépasser un tiers des biens.', 'Wasiyya cannot exceed one third of assets.', 'لا يمكن أن تتجاوز الوصية ثلث الأموال.')}
              </div>
            )}

            {/* Beneficiaries */}
            <div className="space-y-3">
              {data.wasiyya.map((b) => (
                <div key={b.id} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={b.beneficiary}
                      onChange={(e) => updateBeneficiary(b.id, 'beneficiary', e.target.value)}
                      placeholder={tx('Nom du bénéficiaire', 'Beneficiary name', 'اسم المستفيد')}
                      className="flex-1 h-8 text-sm bg-background/60 border-border/50"
                    />
                    <button onClick={() => removeBeneficiary(b.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={b.type}
                      onChange={(e) => updateBeneficiary(b.id, 'type', e.target.value)}
                      className="h-8 rounded-md border border-border/50 bg-background/60 px-2 text-xs text-foreground"
                    >
                      <option value="percentage">%</option>
                      <option value="amount">{tx('Montant', 'Amount', 'المبلغ')}</option>
                    </select>
                    <Input
                      type="number"
                      min={0}
                      max={b.type === 'percentage' ? 33.33 : undefined}
                      value={b.value || ''}
                      onChange={(e) => updateBeneficiary(b.id, 'value', parseFloat(e.target.value) || 0)}
                      placeholder={b.type === 'percentage' ? '0–33.33' : '0'}
                      className="w-28 h-8 text-sm bg-background/60 border-border/50"
                    />
                    <Input
                      value={b.notes}
                      onChange={(e) => updateBeneficiary(b.id, 'notes', e.target.value)}
                      placeholder={tx('Notes...', 'Notes...', 'ملاحظات...')}
                      className="flex-1 h-8 text-sm bg-background/60 border-border/50"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addBeneficiary} className="gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5">
              <Plus className="h-3.5 w-3.5" />
              {tx('Ajouter un bénéficiaire', 'Add beneficiary', 'إضافة مستفيد')}
            </Button>

            <InfoBox>
              {tx(
                'La wasiyya ne doit pas léser les héritiers légaux. Elle est limitée à 1/3 des biens et ne peut bénéficier à un héritier légal sans l\'accord des autres.',
                'Wasiyya must not harm legal heirs. It is limited to 1/3 of assets and cannot benefit a legal heir without others\' consent.',
                'يجب ألا تضر الوصية بالورثة الشرعيين. وهي محددة بثلث الأموال ولا يجوز أن تكون لوارث شرعي إلا بموافقة باقي الورثة.'
              )}
            </InfoBox>
          </div>
        </Section>

        {/* ⑤ Messages personnalisés */}
        <Section
          title={tx('⑤ Messages personnalisés', '⑤ Personal Messages', '⑤ رسائل شخصية')}
          icon={<MessageSquare className="h-3.5 w-3.5 text-primary" />}
          defaultOpen={false}
        >
          <div className="p-5 space-y-4">
            <div className="space-y-3">
              {data.personal_messages.map((msg) => (
                <div key={msg.id} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={msg.recipient}
                      onChange={(e) => updateMessage(msg.id, 'recipient', e.target.value)}
                      placeholder={tx('Destinataire (nom libre)', 'Recipient (free name)', 'المستلم (اسم حر)')}
                      className="flex-1 h-8 text-sm bg-background/60 border-border/50"
                    />
                    <button onClick={() => removeMessage(msg.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    value={msg.title}
                    onChange={(e) => updateMessage(msg.id, 'title', e.target.value)}
                    placeholder={tx('Titre du message', 'Message title', 'عنوان الرسالة')}
                    className="h-8 text-sm bg-background/60 border-border/50"
                  />
                  <Textarea
                    value={msg.content}
                    onChange={(e) => updateMessage(msg.id, 'content', e.target.value)}
                    placeholder={tx('Votre message...', 'Your message...', 'رسالتك...')}
                    className="min-h-[80px] text-sm bg-background/60 border-border/50 resize-none"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={msg.visible_post_death}
                      onChange={(e) => updateMessage(msg.id, 'visible_post_death', e.target.checked)}
                      className="accent-gold"
                    />
                    {tx('Visible après décès uniquement', 'Visible after death only', 'مرئي بعد الوفاة فقط')}
                  </label>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addMessage} className="gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5">
              <Plus className="h-3.5 w-3.5" />
              {tx('Ajouter un message', 'Add a message', 'إضافة رسالة')}
            </Button>
          </div>
        </Section>

        {/* ⑥ Récapitulatif héritage */}
        <Section
          title={tx('⑥ Récapitulatif héritage (lecture seule)', '⑥ Inheritance Summary (read only)', '⑥ ملخص الميراث (للقراءة فقط)')}
          icon={<Users className="h-3.5 w-3.5 text-primary" />}
          defaultOpen={false}
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {tx('Ce bloc est calculé automatiquement — non modifiable ici.', 'This block is auto-calculated — not editable here.', 'يُحسب هذا القسم تلقائياً — غير قابل للتعديل هنا.')}
            </div>

            {/* Static Islamic inheritance shares example */}
            <div className="space-y-2">
              {[
                { label: tx('Épouse', 'Spouse', 'الزوجة'), share: '1/8', note: tx('(si enfants)', '(with children)', '(إذا كان هناك أولاد)') },
                { label: tx('Mère', 'Mother', 'الأم'), share: '1/6', note: tx('(si enfants)', '(with children)', '(إذا كان هناك أولاد)') },
                { label: tx('Fils', 'Son', 'الابن'), share: tx('Reliquat', 'Remainder', 'الباقي'), note: tx('(asaba)', '(asaba)', '(عصبة)') },
              ].map((heir) => (
                <div key={heir.label} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">{heir.label}</p>
                    <p className="text-xs text-muted-foreground">{heir.note}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{heir.share}</span>
                </div>
              ))}
            </div>

            <Link to="/profile">
              <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/5 w-full">
                <ExternalLink className="h-3.5 w-3.5" />
                {tx('Voir l\'onglet Héritage pour calcul détaillé', 'View Inheritance tab for detailed calculation', 'عرض تبويب الميراث للحساب التفصيلي')}
              </Button>
            </Link>
          </div>
        </Section>

        {/* Encryption notice */}
        <p className="text-xs text-muted-foreground text-center py-2">
          🔒 {tx('Toutes les données sont chiffrées de bout en bout — AES-256-GCM', 'All data is end-to-end encrypted — AES-256-GCM', 'جميع البيانات مشفّرة من طرف إلى طرف — AES-256-GCM')}
        </p>
      </div>

      {/* Floating save button on mobile */}
      <button
        onClick={handleSave}
        disabled={saving || wasiyyaExceeds}
        className="md:hidden fixed bottom-6 right-5 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg shadow-black/30 transition-all active:scale-95 disabled:opacity-50"
        aria-label={t('save')}
      >
        {saving ? <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" /> : <Save className="h-5 w-5 text-primary-foreground" />}
      </button>

    </Layout>

  );
}
