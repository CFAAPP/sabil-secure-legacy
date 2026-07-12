import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { encrypt, decrypt } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import {
  User, Heart, Baby, Users, UserCheck, Plus, Minus, Save, Loader2,
  ChevronDown, ChevronUp, Star, Lock
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Child {
  id: string;
  name: string;
  gender: 'male' | 'female';
  alive: boolean;
}

interface Sibling {
  id: string;
  name: string;
  alive: boolean;
}

interface CustomPerson {
  id: string;
  label: string;
  name: string;
  notes: string;
  tag: 'info' | 'potential_heir' | 'potential_wakil';
}

interface FamilyProfile {
  personal_info: {
    full_name: string;
    first_name: string;
    last_name: string;
    gender: 'male' | 'female' | '';
    birth_date: string;
    country: string;
    marital_status: 'single' | 'married' | 'divorced' | 'widowed' | '';
  };
  spouse: {
    enabled: boolean;
    name: string;
    active_marriage: boolean;
  };
  children: {
    count: number;
    items: Child[];
  };
  parents: {
    father_alive: boolean;
    father_name: string;
    father_first_name: string;
    mother_alive: boolean;
    mother_name: string;
  };
  siblings: {
    brothers_count: number;
    sisters_count: number;
    brothers: Sibling[];
    sisters: Sibling[];
  };
  custom_people: CustomPerson[];
}

const EMPTY_PROFILE: FamilyProfile = {
  personal_info: { full_name: '', first_name: '', last_name: '', gender: '', birth_date: '', country: '', marital_status: '' },
  spouse: { enabled: false, name: '', active_marriage: true },
  children: { count: 0, items: [] },
  parents: { father_alive: false, father_name: '', father_first_name: '', mother_alive: false, mother_name: '' },
  siblings: { brothers_count: 0, sisters_count: 0, brothers: [], sisters: [] },
  custom_people: [],
};

function uid() {
  return crypto.randomUUID();
}

function syncItems<T extends { id: string }>(
  current: T[],
  count: number,
  makeNew: (i: number) => T
): T[] {
  const arr = [...current];
  while (arr.length < count) arr.push(makeNew(arr.length));
  return arr.slice(0, count);
}

// ── Translations ─────────────────────────────────────────────────────────────

const tr: Record<string, Record<string, string>> = {
  fr: {
    title: 'Profil & Héritiers',
    subtitle: 'Prépare ton testament islamique',
    myInfo: 'Mes Informations',
    spouse: 'Conjoint(e)',
    children: 'Enfants',
    parents: 'Parents',
    siblings: 'Frères & Soeurs',
    customPeople: 'Personnes Personnalisées',
    fullName: 'Nom complet',
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    fatherFirstName: 'Prénom du père',
    gender: 'Sexe',
    male: 'Homme',
    female: 'Femme',
    birthDate: 'Date de naissance',
    country: 'Pays',
    maritalStatus: 'Situation matrimoniale',
    single: 'Célibataire',
    married: 'Marié(e)',
    divorced: 'Divorcé(e)',
    widowed: 'Veuf(ve)',
    spouseName: 'Nom du conjoint',
    activeMarriage: 'Mariage actuel',
    childrenCount: "Nombre d'enfants",
    childName: 'Prénom / Nom',
    alive: 'Vivant(e)',
    boy: 'Garçon',
    girl: 'Fille',
    yes: 'Oui',
    no: 'Non',
    fatherAlive: 'Père vivant ?',
    motherAlive: 'Mère vivante ?',
    fatherName: 'Nom du père',
    motherName: 'Nom de la mère',
    brothersCount: 'Nombre de frères',
    sistersCount: 'Nombre de soeurs',
    brother: 'Frère',
    sister: 'Soeur',
    addCustom: '+ Ajouter une personne',
    customLabel: 'Libellé (ex: Deuxième épouse)',
    customName: 'Nom',
    customNotes: 'Notes',
    customTag: "Type d'accès",
    tagInfo: 'Informatif',
    tagHeir: 'Héritier potentiel',
    tagWakil: 'Wakil potentiel',
    save: 'Sauvegarder',
    saving: 'Sauvegarde...',
    saved: 'Profil familial sauvegardé !',
    loading: 'Chargement...',
    noInfo: 'Renseigne ton profil familial pour que MIRATH puisse calculer l\'héritage correctement.',
    summary: 'Résumé',
    summaryConjoint: 'Conjoint',
    summaryChildren: 'Enfants',
    summaryParents: 'Parents',
    summaryBrothers: 'Frères',
    summarySisters: 'Soeurs',
    fillLater: 'Remplir plus tard',
    remove: 'Supprimer',
    optional: '(optionnel)',
    readOnly: 'Mode lecture seule (Wakil)',
    encryptedNote: 'Chiffré de bout en bout — AES-256-GCM',
    locked: 'Coffre verrouillé. Déverrouillez votre coffre depuis le tableau de bord.',
    child: 'Enfant',
    father: 'Père',
    mother: 'Mère',
  },
  en: {
    title: 'Profile & Heirs',
    subtitle: 'Prepare your Islamic will',
    myInfo: 'My Information',
    spouse: 'Spouse',
    children: 'Children',
    parents: 'Parents',
    siblings: 'Brothers & Sisters',
    customPeople: 'Custom People',
    fullName: 'Full name',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    birthDate: 'Date of birth',
    country: 'Country',
    maritalStatus: 'Marital status',
    single: 'Single',
    married: 'Married',
    divorced: 'Divorced',
    widowed: 'Widowed',
    spouseName: 'Spouse name',
    activeMarriage: 'Active marriage',
    childrenCount: 'Number of children',
    childName: 'First / Last name',
    alive: 'Alive',
    boy: 'Boy',
    girl: 'Girl',
    yes: 'Yes',
    no: 'No',
    fatherAlive: 'Father alive?',
    motherAlive: 'Mother alive?',
    fatherName: "Father's name",
    motherName: "Mother's name",
    brothersCount: 'Number of brothers',
    sistersCount: 'Number of sisters',
    brother: 'Brother',
    sister: 'Sister',
    addCustom: '+ Add a person',
    customLabel: 'Label (e.g. Second wife)',
    customName: 'Name',
    customNotes: 'Notes',
    customTag: 'Access type',
    tagInfo: 'Informational',
    tagHeir: 'Potential heir',
    tagWakil: 'Potential wakil',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Family profile saved!',
    loading: 'Loading...',
    noInfo: 'Fill in your family profile so MIRATH can correctly calculate the inheritance.',
    summary: 'Summary',
    summaryConjoint: 'Spouse',
    summaryChildren: 'Children',
    summaryParents: 'Parents',
    summaryBrothers: 'Brothers',
    summarySisters: 'Sisters',
    fillLater: 'Fill in later',
    remove: 'Remove',
    optional: '(optional)',
    readOnly: 'Read-only mode (Wakil)',
    encryptedNote: 'End-to-end encrypted — AES-256-GCM',
    locked: 'Vault locked. Unlock your vault from the dashboard.',
    child: 'Child',
    father: 'Father',
    mother: 'Mother',
  },
  ar: {
    title: 'الملف الشخصي والورثة',
    subtitle: 'حضّر وصيتك الإسلامية',
    myInfo: 'معلوماتي',
    spouse: 'الزوج/ة',
    children: 'الأبناء',
    parents: 'الوالدان',
    siblings: 'الإخوة والأخوات',
    customPeople: 'أشخاص مخصصون',
    fullName: 'الاسم الكامل',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    birthDate: 'تاريخ الميلاد',
    country: 'البلد',
    maritalStatus: 'الحالة الاجتماعية',
    single: 'أعزب/عزباء',
    married: 'متزوج/ة',
    divorced: 'مطلّق/ة',
    widowed: 'أرمل/ة',
    spouseName: 'اسم الزوج/ة',
    activeMarriage: 'زواج حالي',
    childrenCount: 'عدد الأبناء',
    childName: 'الاسم',
    alive: 'على قيد الحياة',
    boy: 'ولد',
    girl: 'بنت',
    yes: 'نعم',
    no: 'لا',
    fatherAlive: 'الأب على قيد الحياة؟',
    motherAlive: 'الأم على قيد الحياة؟',
    fatherName: 'اسم الأب',
    motherName: 'اسم الأم',
    brothersCount: 'عدد الإخوة',
    sistersCount: 'عدد الأخوات',
    brother: 'أخ',
    sister: 'أخت',
    addCustom: '+ إضافة شخص',
    customLabel: 'التسمية (مثال: زوجة ثانية)',
    customName: 'الاسم',
    customNotes: 'ملاحظات',
    customTag: 'نوع الوصول',
    tagInfo: 'معلوماتي',
    tagHeir: 'وارث محتمل',
    tagWakil: 'وكيل محتمل',
    save: 'حفظ',
    saving: 'جارٍ الحفظ...',
    saved: 'تم حفظ الملف العائلي!',
    loading: 'جارٍ التحميل...',
    noInfo: 'أدخل ملفك العائلي حتى يتمكن ميراث من حساب الإرث بشكل صحيح.',
    summary: 'ملخص',
    summaryConjoint: 'الزوج/ة',
    summaryChildren: 'الأبناء',
    summaryParents: 'الوالدان',
    summaryBrothers: 'الإخوة',
    summarySisters: 'الأخوات',
    fillLater: 'أكمل لاحقاً',
    remove: 'حذف',
    optional: '(اختياري)',
    readOnly: 'وضع القراءة فقط (وكيل)',
    encryptedNote: 'مشفر من طرف إلى طرف — AES-256-GCM',
    locked: 'الخزنة مقفلة. افتحها من لوحة التحكم.',
    child: 'طفل',
    father: 'الأب',
    mother: 'الأم',
  },
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  iconColor = 'text-gold',
  children,
  defaultOpen = true,
}: {
  icon: any;
  title: string;
  iconColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0 pb-5">{children}</CardContent>}
    </Card>
  );
}

function ToggleYesNo({
  value,
  onChange,
  labelYes,
  labelNo,
  readOnly,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  labelYes: string;
  labelNo: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange(true)}
        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
          value ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-border text-muted-foreground hover:border-emerald-500/30'
        } ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {labelYes}
      </button>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange(false)}
        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
          !value ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'border-border text-muted-foreground hover:border-red-500/30'
        } ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {labelNo}
      </button>
    </div>
  );
}

function CountSelector({
  value,
  onChange,
  min = 0,
  max = 10,
  readOnly,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={readOnly || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-lg font-bold text-foreground">{value}</span>
      <button
        type="button"
        disabled={readOnly || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function GenderSelector({
  value,
  onChange,
  labelMale,
  labelFemale,
  readOnly,
}: {
  value: 'male' | 'female' | '';
  onChange: (v: 'male' | 'female') => void;
  labelMale: string;
  labelFemale: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {(['male', 'female'] as const).map((g) => (
        <button
          key={g}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(g)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
            value === g ? 'bg-gold/15 border-gold/40 text-gold' : 'border-border text-muted-foreground hover:border-gold/30'
          } ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {g === 'male' ? labelMale : labelFemale}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, profile, passphrase, language } = useAuth();
  const lang = (language as 'fr' | 'en') === 'en' ? 'en' : 'fr';
  const T = tr[lang];
  const { toast } = useToast();

  const [data, setData] = useState<FamilyProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vaultItemId, setVaultItemId] = useState<string | null>(null);

  const isReadOnly = false; // wakil mode handled externally

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user || !passphrase || !profile?.encryption_salt) { setLoading(false); return; }
    setLoading(true);

    const { data: row } = await supabase
      .from('vault_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', 'family_profile')
      .maybeSingle();

    if (row) {
      try {
        const json = await decrypt(
          (row as any).content_encrypted,
          (row as any).iv,
          passphrase,
          profile.encryption_salt!
        );
        setData(JSON.parse(json));
        setVaultItemId(row.id);
      } catch { /* passphrase mismatch */ }
    }
    setLoading(false);
  }, [user, passphrase, profile]);

  useEffect(() => { load(); }, [load]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setSaving(true);
    try {
      const json = JSON.stringify(data);
      const { ciphertext, iv } = await encrypt(json, passphrase, profile.encryption_salt);
      const row: any = {
        user_id: user.id,
        item_type: 'family_profile',
        title_encrypted: ciphertext.slice(0, 50),
        content_encrypted: ciphertext,
        iv,
      };

      if (vaultItemId) {
        await supabase.from('vault_items').update(row).eq('id', vaultItemId);
      } else {
        const { data: inserted } = await supabase.from('vault_items').insert(row).select().single();
        if (inserted) setVaultItemId(inserted.id);
      }

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'family_profile_updated',
        entity_type: 'vault_items',
        entity_id: vaultItemId,
      } as any);

      toast({ title: T.saved });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
    setSaving(false);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const setPI = (patch: Partial<FamilyProfile['personal_info']>) =>
    setData((d) => ({ ...d, personal_info: { ...d.personal_info, ...patch } }));

  const setSpouse = (patch: Partial<FamilyProfile['spouse']>) =>
    setData((d) => ({ ...d, spouse: { ...d.spouse, ...patch } }));

  const setParents = (patch: Partial<FamilyProfile['parents']>) =>
    setData((d) => ({ ...d, parents: { ...d.parents, ...patch } }));

  const setChildrenCount = (count: number) => {
    setData((d) => ({
      ...d,
      children: {
        count,
        items: syncItems(
          d.children.items,
          count,
          () => ({ id: uid(), name: '', gender: 'male', alive: true })
        ),
      },
    }));
  };

  const patchChild = (i: number, patch: Partial<Child>) =>
    setData((d) => {
      const items = [...d.children.items];
      items[i] = { ...items[i], ...patch };
      return { ...d, children: { ...d.children, items } };
    });

  const setBrothersCount = (count: number) =>
    setData((d) => ({
      ...d,
      siblings: {
        ...d.siblings,
        brothers_count: count,
        brothers: syncItems(d.siblings.brothers, count, () => ({ id: uid(), name: '', alive: true })),
      },
    }));

  const setSistersCount = (count: number) =>
    setData((d) => ({
      ...d,
      siblings: {
        ...d.siblings,
        sisters_count: count,
        sisters: syncItems(d.siblings.sisters, count, () => ({ id: uid(), name: '', alive: true })),
      },
    }));

  const patchBrother = (i: number, patch: Partial<Sibling>) =>
    setData((d) => {
      const brothers = [...d.siblings.brothers];
      brothers[i] = { ...brothers[i], ...patch };
      return { ...d, siblings: { ...d.siblings, brothers } };
    });

  const patchSister = (i: number, patch: Partial<Sibling>) =>
    setData((d) => {
      const sisters = [...d.siblings.sisters];
      sisters[i] = { ...sisters[i], ...patch };
      return { ...d, siblings: { ...d.siblings, sisters } };
    });

  const addCustom = () =>
    setData((d) => ({
      ...d,
      custom_people: [
        ...d.custom_people,
        { id: uid(), label: '', name: '', notes: '', tag: 'info' },
      ],
    }));

  const patchCustom = (i: number, patch: Partial<CustomPerson>) =>
    setData((d) => {
      const cp = [...d.custom_people];
      cp[i] = { ...cp[i], ...patch };
      return { ...d, custom_people: cp };
    });

  const removeCustom = (i: number) =>
    setData((d) => ({ ...d, custom_people: d.custom_people.filter((_, idx) => idx !== i) }));

  // ── Summary ─────────────────────────────────────────────────────────────────
  const { personal_info: pi, spouse, children, parents, siblings } = data;
  const isMarried = pi.marital_status === 'married';
  const hasAnyData = pi.full_name || pi.gender || children.count > 0 || parents.father_alive || parents.mother_alive;

  const boys = children.items.filter((c) => c.gender === 'male').length;
  const girls = children.items.filter((c) => c.gender === 'female').length;

  // ── Locked state ─────────────────────────────────────────────────────────────
  if (!passphrase) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 border border-border">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-center text-muted-foreground max-w-xs">{T.locked}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in pb-28">

        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 px-5 pt-5 pb-4"
          style={{ background: 'linear-gradient(135deg, hsl(155 28% 26%) 0%, hsl(155 22% 22%) 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold/10 border border-gold/20">
                <Users className="h-4 w-4 text-gold" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold text-gold-gradient">{T.title}</h1>
                <p className="text-xs text-white/50 mt-0.5">{T.subtitle}</p>
              </div>
            </div>
            {!isReadOnly && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || loading}
                className="bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 text-xs"
                variant="outline"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                {saving ? T.saving : T.save}
              </Button>
            )}
          </div>

          {/* Summary strip */}
          {hasAnyData ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
              <span>{T.summaryConjoint}: <span className="text-white/80">{spouse.enabled ? T.yes : T.no}</span></span>
              <span>{T.summaryChildren}: <span className="text-white/80">{children.count} ({lang === 'fr' ? 'G' : 'B'}:{boys} / {lang === 'fr' ? 'F' : 'G'}:{girls})</span></span>
              <span>{T.summaryParents}: <span className="text-white/80">{[parents.father_alive && (lang === 'fr' ? 'Père' : 'Father'), parents.mother_alive && (lang === 'fr' ? 'Mère' : 'Mother')].filter(Boolean).join(', ') || T.no}</span></span>
              <span>{T.summaryBrothers}: <span className="text-white/80">{siblings.brothers_count}</span></span>
              <span>{T.summarySisters}: <span className="text-white/80">{siblings.sisters_count}</span></span>
            </div>
          ) : (
            <p className="text-xs text-white/50 italic">{T.noInfo}</p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">

            {/* ── 1. MES INFOS ── */}
            <SectionCard icon={User} title={T.myInfo}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.fullName}</label>
                  <Input
                    placeholder={T.fullName}
                    value={pi.full_name}
                    onChange={(e) => setPI({ full_name: e.target.value })}
                    disabled={isReadOnly}
                    className="bg-muted/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.gender} *</label>
                  <GenderSelector
                    value={pi.gender}
                    onChange={(g) => setPI({ gender: g })}
                    labelMale={T.male}
                    labelFemale={T.female}
                    readOnly={isReadOnly}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.birthDate}</label>
                    <Input
                      type="date"
                      value={pi.birth_date}
                      onChange={(e) => setPI({ birth_date: e.target.value })}
                      disabled={isReadOnly}
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.country}</label>
                    <Input
                      placeholder={T.country}
                      value={pi.country}
                      onChange={(e) => setPI({ country: e.target.value })}
                      disabled={isReadOnly}
                      className="bg-muted/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.maritalStatus}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['single', 'married', 'divorced', 'widowed'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => setPI({ marital_status: s })}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all text-left ${
                          pi.marital_status === s
                            ? 'bg-gold/15 border-gold/40 text-gold'
                            : 'border-border text-muted-foreground hover:border-gold/30'
                        } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {T[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ── 2. CONJOINT ── */}
            {isMarried && (
              <SectionCard icon={Heart} title={T.spouse} iconColor="text-rose-400">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.spouseName} {T.optional}</label>
                    <Input
                      placeholder={T.spouseName}
                      value={spouse.name}
                      onChange={(e) => setSpouse({ name: e.target.value, enabled: true })}
                      disabled={isReadOnly}
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.activeMarriage}</label>
                    <ToggleYesNo
                      value={spouse.active_marriage}
                      onChange={(v) => setSpouse({ active_marriage: v, enabled: true })}
                      labelYes={T.yes}
                      labelNo={T.no}
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── 3. ENFANTS ── */}
            <SectionCard icon={Baby} title={T.children} iconColor="text-sky-400">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.childrenCount}</label>
                  <CountSelector
                    value={children.count}
                    onChange={setChildrenCount}
                    readOnly={isReadOnly}
                  />
                </div>

                {children.items.length > 0 && (
                  <div className="space-y-3 mt-2">
                    {children.items.map((child, i) => (
                      <div key={child.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {lang === 'fr' ? 'Enfant' : 'Child'} {i + 1}
                          </span>
                        </div>
                        <Input
                          placeholder={`${T.childName} ${T.optional}`}
                          value={child.name}
                          onChange={(e) => patchChild(i, { name: e.target.value })}
                          disabled={isReadOnly}
                          className="bg-background/50 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{T.gender}</label>
                            <GenderSelector
                              value={child.gender}
                              onChange={(g) => patchChild(i, { gender: g })}
                              labelMale={T.boy}
                              labelFemale={T.girl}
                              readOnly={isReadOnly}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{T.alive}</label>
                            <ToggleYesNo
                              value={child.alive}
                              onChange={(v) => patchChild(i, { alive: v })}
                              labelYes={T.yes}
                              labelNo={T.no}
                              readOnly={isReadOnly}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* ── 4. PARENTS ── */}
            <SectionCard icon={UserCheck} title={T.parents} iconColor="text-amber-400">
              <div className="space-y-5">
                {/* Father */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.fatherAlive}</label>
                  <ToggleYesNo
                    value={parents.father_alive}
                    onChange={(v) => setParents({ father_alive: v })}
                    labelYes={T.yes}
                    labelNo={T.no}
                    readOnly={isReadOnly}
                  />
                  {parents.father_alive && (
                    <Input
                      placeholder={`${T.fatherName} ${T.optional}`}
                      value={parents.father_name}
                      onChange={(e) => setParents({ father_name: e.target.value })}
                      disabled={isReadOnly}
                      className="bg-muted/30"
                    />
                  )}
                </div>
                {/* Mother */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.motherAlive}</label>
                  <ToggleYesNo
                    value={parents.mother_alive}
                    onChange={(v) => setParents({ mother_alive: v })}
                    labelYes={T.yes}
                    labelNo={T.no}
                    readOnly={isReadOnly}
                  />
                  {parents.mother_alive && (
                    <Input
                      placeholder={`${T.motherName} ${T.optional}`}
                      value={parents.mother_name}
                      onChange={(e) => setParents({ mother_name: e.target.value })}
                      disabled={isReadOnly}
                      className="bg-muted/30"
                    />
                  )}
                </div>
              </div>
            </SectionCard>

            {/* ── 5. FRÈRES & SŒURS ── */}
            <SectionCard icon={Users} title={T.siblings} iconColor="text-violet-400">
              <div className="space-y-5">
                {/* Brothers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.brothersCount}</label>
                    <CountSelector value={siblings.brothers_count} onChange={setBrothersCount} readOnly={isReadOnly} />
                  </div>
                  {siblings.brothers.map((b, i) => (
                    <div key={b.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">{T.brother} {i + 1}</span>
                      <Input
                        placeholder={`${T.customName} ${T.optional}`}
                        value={b.name}
                        onChange={(e) => patchBrother(i, { name: e.target.value })}
                        disabled={isReadOnly}
                        className="bg-background/50 text-sm"
                      />
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{T.alive}</label>
                        <ToggleYesNo value={b.alive} onChange={(v) => patchBrother(i, { alive: v })} labelYes={T.yes} labelNo={T.no} readOnly={isReadOnly} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sisters */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{T.sistersCount}</label>
                    <CountSelector value={siblings.sisters_count} onChange={setSistersCount} readOnly={isReadOnly} />
                  </div>
                  {siblings.sisters.map((s, i) => (
                    <div key={s.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">{T.sister} {i + 1}</span>
                      <Input
                        placeholder={`${T.customName} ${T.optional}`}
                        value={s.name}
                        onChange={(e) => patchSister(i, { name: e.target.value })}
                        disabled={isReadOnly}
                        className="bg-background/50 text-sm"
                      />
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{T.alive}</label>
                        <ToggleYesNo value={s.alive} onChange={(v) => patchSister(i, { alive: v })} labelYes={T.yes} labelNo={T.no} readOnly={isReadOnly} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* ── 6. PERSONNES PERSONNALISÉES ── */}
            <SectionCard icon={Star} title={T.customPeople} iconColor="text-gold" defaultOpen={false}>
              <div className="space-y-3">
                {data.custom_people.map((cp, i) => (
                  <div key={cp.id} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium"># {i + 1}</span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeCustom(i)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          {T.remove}
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder={T.customLabel}
                      value={cp.label}
                      onChange={(e) => patchCustom(i, { label: e.target.value })}
                      disabled={isReadOnly}
                      className="bg-background/50 text-sm"
                    />
                    <Input
                      placeholder={`${T.customName} ${T.optional}`}
                      value={cp.name}
                      onChange={(e) => patchCustom(i, { name: e.target.value })}
                      disabled={isReadOnly}
                      className="bg-background/50 text-sm"
                    />
                    <Input
                      placeholder={`${T.customNotes} ${T.optional}`}
                      value={cp.notes}
                      onChange={(e) => patchCustom(i, { notes: e.target.value })}
                      disabled={isReadOnly}
                      className="bg-background/50 text-sm"
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">{T.customTag}</label>
                      <div className="flex gap-2 flex-wrap">
                        {(['info', 'potential_heir', 'potential_wakil'] as const).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => patchCustom(i, { tag })}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                              cp.tag === tag ? 'bg-gold/15 border-gold/40 text-gold' : 'border-border text-muted-foreground hover:border-gold/30'
                            } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {tag === 'info' ? T.tagInfo : tag === 'potential_heir' ? T.tagHeir : T.tagWakil}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={addCustom}
                    className="w-full rounded-xl border border-dashed border-gold/30 py-3 text-sm text-gold/70 hover:text-gold hover:border-gold/50 hover:bg-gold/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {T.addCustom}
                  </button>
                )}
              </div>
            </SectionCard>

            {/* Save button bottom */}
            {!isReadOnly && (
              <Button
                className="w-full h-12 text-base font-medium"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? T.saving : T.save}
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center pb-2">
              🔒 {T.encryptedNote}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
