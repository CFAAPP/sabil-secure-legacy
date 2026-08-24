import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, UserCog, Mail, KeyRound, LogOut } from 'lucide-react';
import type { Language } from '@/lib/i18n';

const T = {
  fr: {
    title: 'Mon compte',
    subtitle: 'Gérez vos informations de connexion et vos préférences.',
    infos: 'Informations du compte',
    displayName: 'Nom affiché',
    username: 'Pseudonyme (@)',
    lang: 'Langue de l’application',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Modifications enregistrées',
    email: 'Adresse e-mail',
    newEmail: 'Nouvelle adresse e-mail',
    changeEmail: 'Modifier l’e-mail',
    emailSent: 'E-mail de confirmation envoyé. Vérifiez votre boîte de réception.',
    password: 'Mot de passe',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    changePassword: 'Redéfinir le mot de passe',
    passwordChanged: 'Mot de passe mis à jour',
    mismatch: 'Les mots de passe ne correspondent pas.',
    minLength: 'Le mot de passe doit contenir au moins 8 caractères.',
    invalidEmail: 'Adresse e-mail invalide.',
    invalidUsername: 'Pseudonyme invalide (3-30 caractères : a-z, 0-9, _ ou .)',
    usernameTaken: 'Ce pseudonyme est déjà pris.',
    error: 'Une erreur est survenue.',
    signOut: 'Se déconnecter',
    danger: 'Session',
  },
  en: {
    title: 'My account',
    subtitle: 'Manage your sign-in details and preferences.',
    infos: 'Account information',
    displayName: 'Display name',
    username: 'Username (@)',
    lang: 'App language',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Changes saved',
    email: 'Email address',
    newEmail: 'New email address',
    changeEmail: 'Change email',
    emailSent: 'Confirmation email sent. Please check your inbox.',
    password: 'Password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    changePassword: 'Reset password',
    passwordChanged: 'Password updated',
    mismatch: 'Passwords do not match.',
    minLength: 'Password must be at least 8 characters.',
    invalidEmail: 'Invalid email address.',
    invalidUsername: 'Invalid username (3-30 chars: a-z, 0-9, _ or .)',
    usernameTaken: 'This username is already taken.',
    error: 'Something went wrong.',
    signOut: 'Sign out',
    danger: 'Session',
  },
  ar: {
    title: 'حسابي',
    subtitle: 'إدارة بيانات الدخول والتفضيلات.',
    infos: 'معلومات الحساب',
    displayName: 'الاسم المعروض',
    username: 'الاسم المستعار (@)',
    lang: 'لغة التطبيق',
    save: 'حفظ',
    saving: 'جارٍ الحفظ…',
    saved: 'تم حفظ التغييرات',
    email: 'البريد الإلكتروني',
    newEmail: 'البريد الإلكتروني الجديد',
    changeEmail: 'تغيير البريد الإلكتروني',
    emailSent: 'تم إرسال بريد التأكيد. تحقق من صندوق الوارد.',
    password: 'كلمة المرور',
    newPassword: 'كلمة مرور جديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    changePassword: 'إعادة تعيين كلمة المرور',
    passwordChanged: 'تم تحديث كلمة المرور',
    mismatch: 'كلمتا المرور غير متطابقتين.',
    minLength: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل.',
    invalidEmail: 'بريد إلكتروني غير صالح.',
    invalidUsername: 'اسم مستعار غير صالح (3-30 حرفًا: a-z، 0-9، _ أو .)',
    usernameTaken: 'هذا الاسم المستعار محجوز.',
    error: 'حدث خطأ.',
    signOut: 'تسجيل الخروج',
    danger: 'الجلسة',
  },
};

const LANGS: { value: Language; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

export default function Users() {
  const { user, profile, language, setLanguage, refreshProfile, signOut } = useAuth();
  const t = T[(language as 'fr' | 'en' | 'ar')] || T.fr;
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [lang, setLang] = useState<Language>(language);
  const [savingInfos, setSavingInfos] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setLang((profile.language as Language) || 'fr');
    }
  }, [profile]);

  const saveInfos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const uname = username.trim().toLowerCase();
    if (uname && !/^[a-z0-9_.]{3,30}$/.test(uname)) {
      toast({ title: t.invalidUsername, variant: 'destructive' });
      return;
    }
    setSavingInfos(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        username: uname || null,
        language: lang,
      })
      .eq('user_id', user.id);
    if (error) {
      const taken = (error as any).code === '23505';
      toast({ title: taken ? t.usernameTaken : t.error, variant: 'destructive' });
    } else {
      setLanguage(lang);
      await refreshProfile();
      toast({ title: t.saved });
    }
    setSavingInfos(false);
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast({ title: t.invalidEmail, variant: 'destructive' });
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: window.location.origin }
    );
    if (error) {
      toast({ title: t.error, description: error.message, variant: 'destructive' });
    } else {
      setNewEmail('');
      toast({ title: t.emailSent });
    }
    setSavingEmail(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: t.minLength, variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t.mismatch, variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: t.error, description: error.message, variant: 'destructive' });
    } else {
      setPassword('');
      setConfirmPassword('');
      toast({ title: t.passwordChanged });
    }
    setSavingPassword(false);
  };

  const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wider';
  const cardCls = 'rounded-2xl border border-primary/15 bg-card p-5 sm:p-6 shadow-sm space-y-4';

  return (
    <Layout>
      <div className="w-full min-w-0 space-y-4 animate-fade-in pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-4 flex items-center gap-3">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-2xl bg-primary/15 border border-primary/20">
            <UserCog className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-foreground uppercase tracking-wide">{t.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        {/* Account info */}
        <form onSubmit={saveInfos} className={cardCls}>
          <h2 className="font-display text-base text-foreground">{t.infos}</h2>
          <div className="space-y-1.5">
            <label className={labelCls}>{t.displayName}</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} className="bg-muted/30" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>{t.username}</label>
            <div className="flex items-center gap-1 rounded-md border border-input bg-muted/30 px-2 focus-within:ring-2 focus-within:ring-ring">
              <span className="text-muted-foreground text-sm">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                className="flex-1 bg-transparent py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>{t.lang}</label>
            <div className="flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLang(l.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    lang === l.value ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={savingInfos} className="w-full h-10 gap-2">
            {savingInfos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="text-sm font-medium">{savingInfos ? t.saving : t.save}</span>
          </Button>
        </form>

        {/* Email */}
        <form onSubmit={changeEmail} className={cardCls}>
          <h2 className="font-display text-base text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> {t.email}
          </h2>
          <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
          <div className="space-y-1.5">
            <label className={labelCls}>{t.newEmail}</label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} maxLength={255} className="bg-muted/30" />
          </div>
          <Button type="submit" variant="outline" disabled={savingEmail || !newEmail} className="w-full h-10 gap-2">
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            <span className="text-sm font-medium">{t.changeEmail}</span>
          </Button>
        </form>

        {/* Password */}
        <form onSubmit={changePassword} className={cardCls}>
          <h2 className="font-display text-base text-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> {t.password}
          </h2>
          <div className="space-y-1.5">
            <label className={labelCls}>{t.newPassword}</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="bg-muted/30" />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>{t.confirmPassword}</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="bg-muted/30" />
          </div>
          <Button type="submit" disabled={savingPassword || !password} className="w-full h-10 gap-2">
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            <span className="text-sm font-medium">{t.changePassword}</span>
          </Button>
        </form>

        {/* Session */}
        <div className={cardCls}>
          <h2 className="font-display text-base text-foreground">{t.danger}</h2>
          <Button type="button" variant="outline" onClick={() => signOut()} className="w-full h-10 gap-2">
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">{t.signOut}</span>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
