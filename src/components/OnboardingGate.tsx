import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, Save } from 'lucide-react';
import {
  EMPTY_FAMILY_PROFILE,
  getFamilyIdentity,
  isFamilyIdentityComplete,
  loadLatestFamilyProfile,
  saveFamilyProfile,
} from '@/lib/familyProfile';

const T = {
  fr: {
    title: 'Bienvenue sur Mirath',
    subtitle: 'Renseignez vos informations d\'identité pour établir votre testament.',
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    birthDate: 'Date de naissance',
    fatherFirstName: 'Prénom du père',
    gender: 'Sexe',
    male: 'Homme',
    female: 'Femme',
    continue: 'Continuer',
    saving: 'Enregistrement…',
    required: 'Tous les champs sont obligatoires.',
    error: 'Erreur lors de l\'enregistrement.',
    footer: 'Ces informations serviront à générer votre déclaration testamentaire. Elles sont chiffrées de bout en bout.',
    locked: 'Coffre verrouillé — déverrouillez votre coffre pour continuer.',
  },
  en: {
    title: 'Welcome to Mirath',
    subtitle: 'Please fill in your identity to prepare your will.',
    firstName: 'First name',
    lastName: 'Last name',
    birthDate: 'Date of birth',
    fatherFirstName: "Father's first name",
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    continue: 'Continue',
    saving: 'Saving…',
    required: 'All fields are required.',
    error: 'Failed to save.',
    footer: 'This information will be used to generate your testamentary declaration. It is end-to-end encrypted.',
    locked: 'Vault locked — unlock it to continue.',
  },
  ar: {
    title: 'مرحباً بك في ميراث',
    subtitle: 'يرجى إدخال بياناتك الشخصية لإعداد وصيتك.',
    firstName: 'الاسم',
    lastName: 'اسم العائلة',
    birthDate: 'تاريخ الميلاد',
    fatherFirstName: 'اسم الأب',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    continue: 'متابعة',
    saving: 'جارٍ الحفظ…',
    required: 'جميع الحقول مطلوبة.',
    error: 'فشل الحفظ.',
    footer: 'ستُستخدم هذه المعلومات لإنشاء إعلان الوصية. جميعها مشفّرة من طرف إلى طرف.',
    locked: 'الخزنة مقفلة — يرجى فتحها للمتابعة.',
  },
};

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, profile, passphrase, language } = useAuth();
  const t = T[language as 'fr' | 'en' | 'ar'] || T.fr;

  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [fatherFirstName, setFatherFirstName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user || !passphrase || !profile?.encryption_salt) {
        setChecking(false);
        return;
      }
      setChecking(true);

      let decoded: any = null;
      try {
        const latest = await loadLatestFamilyProfile(user.id, passphrase, profile.encryption_salt);
        if (cancelled) return;
        if (latest) {
          decoded = latest.data;
          setExistingId(latest.id);
          setExistingProfile(decoded);
        }
      } catch {
        if (!cancelled) setChecking(false);
        return;
      }

      const identity = getFamilyIdentity(decoded);
      const hasAll = isFamilyIdentityComplete(identity);
      const hasUsername = !!profile.username;

      if (!hasAll || !hasUsername) {
        setFirstName(identity.first_name);
        setLastName(identity.last_name);
        setBirthDate(identity.birth_date);
        setFatherFirstName(identity.father_first_name);
        setGender(identity.gender);
        setUsername(profile.username || '');
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
      setChecking(false);
    };

    check();
    return () => { cancelled = true; };
  }, [user, passphrase, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !passphrase || !profile?.encryption_salt) return;

    if (!firstName.trim() || !lastName.trim() || !birthDate.trim() || !fatherFirstName.trim() || !gender) {
      toast({ title: t.required, variant: 'destructive' });
      return;
    }

    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(uname)) {
      setUsernameError('invalid');
      toast({ title: language === 'ar' ? 'اسم مستعار غير صالح' : language === 'en' ? 'Invalid username (3-30 chars, letters/digits/./_)' : 'Pseudonyme invalide (3-30 caractères, lettres/chiffres/./_).', variant: 'destructive' });
      return;
    }

    setSaving(true);
    setUsernameError(null);
    try {
      // Save username on profiles (unique constraint enforces uniqueness)
      if (uname !== (profile.username || '').toLowerCase()) {
        const { error: unameErr } = await supabase
          .from('profiles')
          .update({ username: uname })
          .eq('user_id', user.id);
        if (unameErr) {
          const msg = (unameErr as any).code === '23505'
            ? (language === 'ar' ? 'هذا الاسم المستعار محجوز.' : language === 'en' ? 'This username is already taken.' : 'Ce pseudonyme est déjà pris.')
            : (unameErr.message || t.error);
          toast({ title: msg, variant: 'destructive' });
          setUsernameError('taken');
          setSaving(false);
          return;
        }
      }

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

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'onboarding_completed',
        entity_type: 'vault_items',
        entity_id: savedId,
      } as any);

      // Force a reload so AuthContext picks up the new username
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast({ title: t.error, variant: 'destructive' });
    }
    setSaving(false);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    );
  }

  if (!needsOnboarding) return <>{children}</>;

  // Blocking full-screen onboarding
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-card shadow-2xl shadow-black/40 p-6 my-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/15 border border-primary/20">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{t.title}</h2>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.firstName} *</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={60}
                required
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.lastName} *</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={60}
                required
                className="bg-muted/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.fatherFirstName} *</label>
            <Input
              value={fatherFirstName}
              onChange={(e) => setFatherFirstName(e.target.value)}
              maxLength={60}
              required
              className="bg-muted/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.birthDate} *</label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
              className="bg-muted/30"
            />
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
                    gender === g
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {g === 'male' ? t.male : t.female}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {language === 'ar' ? 'اسم مستعار (@)' : language === 'en' ? 'Username (@)' : 'Pseudonyme (@)'} *
            </label>
            <div className="flex items-center gap-1 rounded-md border border-input bg-muted/30 px-2 focus-within:ring-2 focus-within:ring-ring">
              <span className="text-muted-foreground text-sm">@</span>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUsernameError(null); }}
                maxLength={30}
                required
                pattern="[a-zA-Z0-9_.]{3,30}"
                className="flex-1 bg-transparent py-2 text-sm outline-none"
                placeholder={language === 'ar' ? 'مثال: youssef.n' : 'ex: youssef.n'}
              />
            </div>
            <p className={`text-[11px] ${usernameError ? 'text-destructive' : 'text-muted-foreground'} leading-snug`}>
              {usernameError === 'taken'
                ? (language === 'ar' ? 'هذا الاسم المستعار محجوز.' : language === 'en' ? 'This username is already taken.' : 'Ce pseudonyme est déjà pris.')
                : (language === 'ar' ? '3-30 حرفًا: أحرف، أرقام، . أو _' : language === 'en' ? '3-30 chars: letters, digits, . or _' : '3-30 caractères : lettres, chiffres, . ou _')}
            </p>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-10 gap-2"
            style={{ background: 'linear-gradient(135deg, hsl(43 62% 46%) 0%, hsl(38 70% 56%) 100%)' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="text-primary-foreground text-sm font-medium">{saving ? t.saving : t.continue}</span>
          </Button>

          <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed pt-1">
            🔒 {t.footer}
          </p>
        </form>
      </div>
    </div>
  );
}
