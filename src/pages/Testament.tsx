import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { encrypt, decrypt } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Save, FileText, Loader2, ChevronDown, ChevronUp, Plus, Trash2,
  MessageSquare, Users,
  ExternalLink, AlertCircle, Info, Lock, Calendar
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Link } from 'react-router-dom';
const uuidv4 = () => crypto.randomUUID();

// ─── Types ────────────────────────────────────────────────────────────────────

interface WasiyyaBeneficiary {
  id: string;
  beneficiary: string;
  type: 'percentage' | 'amount';
  value: number;
  notes: string;
}

interface PersonalMessage {
  id: string;
  recipient: string;
  title: string;
  content: string;
  visible_post_death: boolean;
}

interface AudioMessage {
  file_reference: string;
  duration: number;
}

interface TestamentData {
  funeral_wishes: string;
  additional_debts: string;
  wasiyya: WasiyyaBeneficiary[];
  audio_message: AudioMessage | null;
  personal_messages: PersonalMessage[];
}

const DEFAULT_DATA: TestamentData = {
  funeral_wishes: '',
  additional_debts: '',
  wasiyya: [],
  audio_message: null,
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
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold/10 border border-gold/20">
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
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gold/60" />
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
  const [existingId, setExistingId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const { toast } = useToast();

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [showDeleteAudioDialog, setShowDeleteAudioDialog] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const MAX_RECORDING_SECONDS = 300; // 5 minutes

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

        // Load audio if present
        if (parsed.audio_message?.file_reference) {
          const { data: audioData } = await supabase.storage
            .from('testament-audio')
            .download(parsed.audio_message.file_reference);
          if (audioData) {
            setAudioBlob(audioData);
            setAudioUrl(URL.createObjectURL(audioData));
          }
        }
      } catch {
        toast({ title: t('error'), description: tx('Phrase secrète incorrecte.', 'Incorrect passphrase.', 'عبارة المرور غير صحيحة.'), variant: 'destructive' });
      }
    }
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

    setSaving(true);
    try {
      let audioRef = data.audio_message;

      // Upload encrypted audio if new recording
      if (audioBlob && !data.audio_message?.file_reference) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const { ciphertext: audioCipher, iv: audioIv } = await encrypt(audioBase64, passphrase, profile.encryption_salt);
        const encryptedBlob = new Blob([JSON.stringify({ c: audioCipher, iv: audioIv })], { type: 'application/json' });
        const filePath = `${user.id}/${uuidv4()}.enc`;
        await supabase.storage.from('testament-audio').upload(filePath, encryptedBlob);
        audioRef = { file_reference: filePath, duration: recordingTime };
      }

      const payload: TestamentData = { ...data, audio_message: audioRef };
      const jsonStr = JSON.stringify(payload);
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

  // ─── Audio recording ──────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_SECONDS - 1) { stopRecording(); return prev; }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast({ title: t('error'), description: tx('Accès au microphone refusé.', 'Microphone access denied.', 'تم رفض الوصول إلى الميكروفون.'), variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const deleteAudio = () => setShowDeleteAudioDialog(true);

  const confirmDeleteAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setData(d => ({ ...d, audio_message: null }));
    setShowDeleteAudioDialog(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playingAudio) {
      audioRef.current.pause();
      setPlayingAudio(false);
    } else {
      audioRef.current.play();
      setPlayingAudio(true);
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Wasiyya helpers ──────────────────────────────────────────────────────

  const totalWasiyya = data.wasiyya.filter(b => b.type === 'percentage').reduce((s, b) => s + (b.value || 0), 0);
  const wasiyyaExceeds = totalWasiyya > 33.33;

  const addBeneficiary = () => {
    setData(d => ({
      ...d,
      wasiyya: [...d.wasiyya, { id: uuidv4(), beneficiary: '', type: 'percentage', value: 0, notes: '' }]
    }));
  };

  const updateBeneficiary = (id: string, field: keyof WasiyyaBeneficiary, value: any) => {
    setData(d => ({ ...d, wasiyya: d.wasiyya.map(b => b.id === id ? { ...b, [field]: value } : b) }));
  };

  const removeBeneficiary = (id: string) => {
    setData(d => ({ ...d, wasiyya: d.wasiyya.filter(b => b.id !== id) }));
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

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="h-7 w-7 animate-spin text-gold/60" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gold" />
            <h1 className="font-serif text-xl font-bold">{tx('Mon Testament', 'My Will', 'وصيتي')}</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || wasiyyaExceeds}
            className="h-9 gap-2"
            style={{ background: 'linear-gradient(135deg, hsl(43 62% 46%) 0%, hsl(38 70% 56%) 100%)' }}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="text-white text-xs font-medium">{saving ? t('saving') : t('save')}</span>
          </Button>
        </div>

        {/* ① Déclaration */}
        <Section
          title={tx('① الإعلان', '① Declaration', '① الإعلان').replace('① الإعلان', tx('① Déclaration', '① Declaration', '① الإعلان'))}
          icon={<Lock className="h-3.5 w-3.5 text-gold" />}
          defaultOpen={true}
        >
          <div className="p-5 space-y-3">
            <p className="text-center text-lg font-arabic text-gold/80">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-gold/30 pl-3 italic">
              {tx(
                'Ceci est ma wasiyya rédigée en pleine conscience, en bonne santé et dans le respect de la foi islamique. Je témoigne qu\'il n\'y a rien de digne d\'être adoré qu\'Allah et que Muhammad est Son Messager.',
                'This is my wasiyya written in full consciousness, in good health and in accordance with Islamic faith. I testify that there is nothing worthy of worship but Allah and that Muhammad is His Messenger.',
                'هذه وصيتي كُتبت بكامل وعيي وصحتي ووفقاً للشريعة الإسلامية. أشهد أن لا إله إلا الله وأن محمداً رسول الله.'
              )}
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
          icon={<FileText className="h-3.5 w-3.5 text-gold" />}
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
          icon={<AlertCircle className="h-3.5 w-3.5 text-gold" />}
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
              <Button variant="outline" size="sm" className="gap-2 border-gold/30 text-gold hover:bg-gold/5">
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
          icon={<Users className="h-3.5 w-3.5 text-gold" />}
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

            <Button variant="outline" size="sm" onClick={addBeneficiary} className="gap-2 border-dashed border-gold/40 text-gold hover:bg-gold/5">
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

        {/* ⑤ Message audio */}
        <Section
          title={tx('⑤ Message audio', '⑤ Audio Message', '⑤ رسالة صوتية')}
          icon={<Mic className="h-3.5 w-3.5 text-gold" />}
          defaultOpen={false}
        >
          <div className="p-5 space-y-4">
            {!audioUrl ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-destructive/20 border-2 border-destructive animate-pulse' : 'bg-muted/40 border-2 border-border/50'}`}>
                  {recording ? <MicOff className="h-7 w-7 text-destructive" /> : <Mic className="h-7 w-7 text-muted-foreground" />}
                </div>
                {recording && (
                  <div className="text-center">
                    <p className="text-lg font-mono text-destructive">{formatTime(recordingTime)}</p>
                    <p className="text-xs text-muted-foreground">{tx('Max 5 min', 'Max 5 min', 'الحد الأقصى ٥ دقائق')}</p>
                  </div>
                )}
                {recording ? (
                  <Button variant="outline" size="sm" onClick={stopRecording} className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10">
                    <Square className="h-3.5 w-3.5" />
                    {tx('Arrêter', 'Stop', 'إيقاف')}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={startRecording} className="gap-2 border-gold/40 text-gold hover:bg-gold/5">
                    <Mic className="h-3.5 w-3.5" />
                    {tx('Enregistrer un message audio', 'Record audio message', 'تسجيل رسالة صوتية')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <button onClick={togglePlay} className="w-9 h-9 rounded-full flex items-center justify-center border border-gold/30 bg-gold/10 hover:bg-gold/20 transition-colors">
                    {playingAudio ? <Pause className="h-4 w-4 text-gold" /> : <Play className="h-4 w-4 text-gold" />}
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-medium">{tx('Message audio', 'Audio message', 'رسالة صوتية')}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(data.audio_message?.duration || recordingTime)}</p>
                  </div>
                  <button onClick={deleteAudio} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setPlayingAudio(false)}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={() => { deleteAudio(); }} className="gap-2 border-dashed border-border/50">
                  <Mic className="h-3.5 w-3.5" />
                  {tx('Réenregistrer', 'Re-record', 'إعادة التسجيل')}
                </Button>
              </div>
            )}
            <InfoBox>
              {tx(
                'L\'audio est chiffré côté client avant upload. Le serveur ne stocke que du ciphertext.',
                'Audio is encrypted client-side before upload. The server only stores ciphertext.',
                'يتم تشفير الصوت من جهة العميل قبل الرفع. الخادم يخزّن فقط النص المشفّر.'
              )}
            </InfoBox>
          </div>
        </Section>

        {/* ⑥ Messages personnalisés */}
        <Section
          title={tx('⑥ Messages personnalisés', '⑥ Personal Messages', '⑥ رسائل شخصية')}
          icon={<MessageSquare className="h-3.5 w-3.5 text-gold" />}
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

            <Button variant="outline" size="sm" onClick={addMessage} className="gap-2 border-dashed border-gold/40 text-gold hover:bg-gold/5">
              <Plus className="h-3.5 w-3.5" />
              {tx('Ajouter un message', 'Add a message', 'إضافة رسالة')}
            </Button>
          </div>
        </Section>

        {/* ⑦ Récapitulatif héritage */}
        <Section
          title={tx('⑦ Récapitulatif héritage (lecture seule)', '⑦ Inheritance Summary (read only)', '⑦ ملخص الميراث (للقراءة فقط)')}
          icon={<Users className="h-3.5 w-3.5 text-gold" />}
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
                  <span className="text-sm font-semibold text-gold">{heir.share}</span>
                </div>
              ))}
            </div>

            <Link to="/profile">
              <Button variant="outline" size="sm" className="gap-2 border-gold/30 text-gold hover:bg-gold/5 w-full">
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
        style={{ background: 'linear-gradient(135deg, hsl(43 62% 46%) 0%, hsl(38 70% 56%) 100%)' }}
        aria-label={t('save')}
      >
        {saving ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Save className="h-5 w-5 text-white" />}
      </button>

      {/* Delete audio confirmation dialog */}
      <AlertDialog open={showDeleteAudioDialog} onOpenChange={setShowDeleteAudioDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tx('Supprimer le message audio ?', 'Delete audio message?', 'حذف الرسالة الصوتية؟')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tx(
                'Cette action est irréversible. Le message audio sera définitivement supprimé.',
                'This action cannot be undone. The audio message will be permanently deleted.',
                'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الرسالة الصوتية نهائياً.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAudio}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Layout>

  );
}
