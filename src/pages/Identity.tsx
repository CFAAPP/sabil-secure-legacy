import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Save } from 'lucide-react';
import {
  EMPTY_FAMILY_PROFILE,
  getFamilyIdentity,
  loadLatestFamilyProfile,
  saveFamilyProfile,
} from '@/lib/familyProfile';

const T = {
  fr: {
    title: 'Mon identité',
    subtitle: 'Modifiez vos informations personnelles. Elles sont utilisées dans votre testament et sur la page d\'accueil.',
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    birthDate: 'Date de naissance',
    fatherFirstName: 'Prénom du père',
    gender: 'Sexe',
    male: 'Homme',
    female: 'Femme',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Modifications enregistrées',
    required: 'Tous les champs sont obligatoires.',
    error: 'Erreur lors de l\'enregistrement.',
    preview: 'Aperçu',
  },
  en: {
    title: 'My identity',
    subtitle: 'Update your personal information. It is used in your will and on the home page.',
    firstName: 'First name',
    lastName: 'Last name',
    birthDate: 'Date of birth',
    fatherFirstName: "Father's first name",
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Changes saved',
    required: 'All fields are required.',
    error: 'Failed to save.',
    preview: 'Preview',
  },
  ar: {
    title: 'هويتي',
    subtitle: 'قم بتحديث معلوماتك الشخصية. تُستخدم في وصيتك وصفحة الاستقبال.',
    firstName: 'الاسم',
    lastName: 'اسم العائلة',
    birthDate: 'تاريخ الميلاد',
    fatherFirstName: 'اسم الأب',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    save: 'حفظ',
    saving: 'جارٍ الحفظ…',
    saved: 'تم حفظ التغييرات',
    required: 'جميع الحقول مطلوبة.',
    error: 'فشل الحفظ.',
    preview: 'معاينة',
  },
};

export default function Identity() {
  const { user, profile, passphrase, language } = useAuth();
  const t = T[language as 'fr' | 'en' | 'ar'] || T.fr;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user || !passphrase || !profile?.encryption_salt) {
        setLoading(false);
        return;
      }
      try {
        const latest = await loadLatestFamilyProfile(user.id, passphrase, profile.encryption_salt);
        if (cancelled) return;
        if (latest) {
          setExistingId(latest.id);
          setExistingProfile(latest.data);
          const id = getFamilyIdentity(latest.data);
          setFirstName(id.first_name);
          setLastName(id.last_name);
          setBirthDate(id.birth_date);
          setFatherFirstName(id.father_first_name);
          setGender(id.gender);
        }
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [user, passphrase, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !passphrase || !profile?.encryption_salt) return;

    if (!firstName.trim() || !lastName.trim() || !birthDate.trim() || !fatherFirstName.trim() || !gender) {
      toast({ title: t.required, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const base = existingProfile || EMPTY_FAMILY_PROFILE;
      const next = {
        ...base,
        personal_info: {
          ...base.personal_info,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          birth_date: birthDate,
          gender,
        },
        parents: {
          ...base.parents,
          father_first_name: fatherFirstName.trim(),
        },
      };
      const savedId = await saveFamilyProfile({
        userId: user.id,
        passphrase,
        salt: profile.encryption_salt,
        data: next,
        existingId,
      });
      setExistingId(savedId);
      setExistingProfile(next);
      toast({ title: t.saved });
    } catch (err) {
      console.error(err);
      toast({ title: t.error, variant: 'destructive' });
    }
    setSaving(false);
  };

  const link = gender === 'female' ? 'bint' : 'ibn';
  const preview = firstName
    ? `${firstName}${fatherFirstName ? ` ${link} ${fatherFirstName}` : ''}${lastName ? ` ${lastName}` : ''}`
    : '—';

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold/10 border border-gold/20">
            <UserCircle className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground uppercase tracking-wide">{t.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold/60" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gold/15 bg-card p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.firstName} *</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} required className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.lastName} *</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} required className="bg-muted/30" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.fatherFirstName} *</label>
              <Input value={fatherFirstName} onChange={(e) => setFatherFirstName(e.target.value)} maxLength={60} required className="bg-muted/30" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.birthDate} *</label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} required className="bg-muted/30" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.gender} *</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      gender === g ? 'bg-gold/15 border-gold/40 text-gold' : 'border-border text-muted-foreground hover:border-gold/30'
                    }`}
                  >
                    {g === 'male' ? t.male : t.female}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gold/15 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.preview}</p>
              <p className="font-serif text-base text-gold mt-0.5">{preview}</p>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-10 gap-2"
              style={{ background: 'linear-gradient(135deg, hsl(43 62% 46%) 0%, hsl(38 70% 56%) 100%)' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="text-white text-sm font-medium">{saving ? t.saving : t.save}</span>
            </Button>
          </form>
        )}
      </div>
    </Layout>
  );
}
