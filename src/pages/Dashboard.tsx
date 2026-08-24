import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, isRTL } from '@/lib/i18n';
import { FilePen, Wallet, Lock, User, Calculator, ClipboardCheck, RotateCcw, Scale, ShieldCheck, ScrollText, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useIdentity } from '@/hooks/useIdentity';

export default function Dashboard() {
  const { user, profile, language } = useAuth();
  const t = useTranslation(language);
  const rtl = isRTL(language);
  const { formalName, isComplete } = useIdentity();

  const [flipped, setFlipped] = useState<string | null>(null);

  const hints: Record<string, { fr: string; en: string; ar: string }> = {
    '/testament': {
      fr: 'Rédigez et sécurisez votre testament, chiffré de bout en bout.',
      en: 'Write and secure your will, encrypted end-to-end.',
      ar: 'اكتب وصيتك واحفظها مشفّرة بالكامل.',
    },
    '/debts': {
      fr: 'Suivez vos dettes, remboursements partiels et échéances.',
      en: 'Track your debts, partial repayments and due dates.',
      ar: 'تابع ديونك والسدادات الجزئية والمواعيد.',
    },
    '/contracts': {
      fr: 'Créez vos contrats, parties, clauses et pièces jointes.',
      en: 'Create contracts with parties, clauses and attachments.',
      ar: 'أنشئ عقودك مع الأطراف والشروط والمرفقات.',
    },
    '/zakat': {
      fr: 'Calculez votre Zakât al-Mâl selon le nisab actuel.',
      en: 'Calculate your Zakat al-Mal based on the current nisab.',
      ar: 'احسب زكاة مالك حسب النصاب الحالي.',
    },
    '/wakils': {
      fr: 'Désignez des personnes de confiance en lecture seule.',
      en: 'Appoint trusted proxies with read-only access.',
      ar: 'عيّن وكلاء موثوقين بصلاحية القراءة فقط.',
    },
    '/profile': {
      fr: 'Renseignez votre identité et vos héritiers.',
      en: 'Fill in your identity and your heirs.',
      ar: 'أدخل هويتك ووارثيك.',
    },
  };

  const isSecure = Boolean(user && profile?.encryption_salt && isComplete);

  const cards = [
    { title: t('testament'), arabic: 'وَصِيَّتِي', description: t('writeWill'), icon: FilePen, path: '/testament' },
    { title: t('debts'), arabic: 'دُيُونِي', description: t('manageDebts'), icon: Wallet, path: '/debts' },
    { title: t('contracts'), arabic: 'عُقُودِي', description: t('manageContracts'), icon: ClipboardCheck, path: '/contracts' },
    { title: 'Zakât al-Mâl', arabic: 'زَكَاةُ المَال', description: t('zakatCalc'), icon: Calculator, path: '/zakat' },
    { title: t('wakils'), arabic: 'وُكَلَائِي', description: t('designateTrusted'), icon: ShieldCheck, path: '/wakils' },
    { title: t('profileHeirs'), arabic: 'مَعْلُومَاتِي', description: t('prepareWill'), icon: Scale, path: '/profile' },

  ];


  return (
    <Layout>
      <div className="space-y-3 animate-fade-in">
        {/* Hero violet */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-gold p-6 shadow-gold">
          <div className="absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-primary-foreground/10 blur-2xl" />
          <p className="relative text-[11px] font-arabic text-primary-foreground/70">بسم الله الرحمن الرحيم</p>
          <p className="relative mt-4 text-xs uppercase tracking-[0.2em] text-primary-foreground/70">{t('welcomeBack')}</p>
          <h1 className="relative mt-1.5 font-display text-2xl leading-tight text-primary-foreground">
            {formalName || profile?.display_name || user?.email?.split('@')[0]}
          </h1>

          <div className="relative mt-5 flex items-center gap-2 rounded-full bg-background/25 px-3 py-2 backdrop-blur-sm">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full animate-pulse ${
                isSecure
                  ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]'
                  : 'bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]'
              }`}
              aria-label={isSecure ? t('securitySecure') : t('securityAtRisk')}
            />
            <p className="text-[11px] font-medium text-primary-foreground">
              {isSecure ? t('securitySecure') : t('securityAtRisk')} · AES-256-GCM · E2E
            </p>
            <Lock className="ms-auto h-3.5 w-3.5 text-primary-foreground/80" strokeWidth={2} />
          </div>
        </div>

        {/* Rappel prophétique */}
        <div className="rounded-3xl bg-card px-4 py-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
              <ScrollText className="h-4 w-4 text-primary" strokeWidth={1.8} />
            </div>
            <div>
              <p className="font-quran text-[15px] leading-loose text-foreground" dir="rtl">
                مَا حَقُّ امْرِئٍ مُسْلِمٍ لَهُ شَيْءٌ يُوصِي فِيهِ يَبِيتُ لَيْلَتَيْنِ إِلَّا وَوَصِيَّتُهُ مَكْتُوبَةٌ عِنْدَهُ
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                {language === 'ar'
                  ? 'رواه البخاري ومسلم.'
                  : language === 'en'
                  ? '"It is not right for a Muslim who has something to bequeath to spend two nights without having his will written with him." — Bukhari & Muslim.'
                  : "« Il n'est pas convenable qu'un musulman ayant quelque chose à léguer passe deux nuits sans que son testament ne soit écrit auprès de lui. » — Boukhari et Muslim."}
              </p>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card, i) => {
            const highlight = i === 0;
            const isFlipped = flipped === card.path;
            const hint = hints[card.path]?.[language as 'fr' | 'en' | 'ar'] ?? card.description;
            return (
              <div key={card.path} className="flip-perspective h-[180px]">
                <div className={`flip-inner relative h-full w-full ${isFlipped ? 'is-flipped' : ''}`}>
                  {/* Front */}
                  <button
                    type="button"
                    onClick={() => setFlipped(card.path)}
                    aria-label={card.title}
                    className={`flip-face absolute inset-0 flex flex-col items-start justify-between overflow-hidden rounded-[28px] p-4 text-start transition-transform duration-300 active:scale-[0.98] ${
                      highlight ? 'bg-gradient-gold shadow-gold' : 'bg-card'
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        highlight ? 'bg-background/25' : 'bg-primary/15'
                      }`}
                    >
                      <card.icon
                        className={`h-5 w-5 ${highlight ? 'text-primary-foreground' : 'text-primary'}`}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="w-full">
                      <p
                        className={`font-arabic text-base leading-none ${
                          highlight ? 'text-primary-foreground/80' : 'text-primary'
                        }`}
                        dir="rtl"
                      >
                        {card.arabic}
                      </p>
                      <h3
                        className={`mt-2 font-display text-[15px] leading-[1.15] ${
                          highlight ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {card.title}
                      </h3>
                      <span
                        className={`mt-2 inline-flex items-center gap-1 text-[9.5px] uppercase tracking-[0.12em] ${
                          highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        <Info className="h-3 w-3" strokeWidth={1.8} />
                        {language === 'ar' ? 'اقلب' : language === 'en' ? 'Flip' : 'Retourner'}
                      </span>
                    </div>
                  </button>

                  {/* Back */}
                  <Link
                    to={card.path}
                    className={`flip-face flip-back absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[28px] p-4 no-underline ${
                      highlight ? 'bg-gradient-gold' : 'bg-secondary'
                    }`}
                  >
                    <div>
                      <p
                        className={`font-display text-[13px] uppercase tracking-[0.06em] ${
                          highlight ? 'text-primary-foreground/80' : 'text-primary'
                        }`}
                      >
                        {card.title}
                      </p>
                      <p
                        className={`mt-2 text-[11.5px] leading-relaxed ${
                          highlight ? 'text-primary-foreground/85' : 'text-muted-foreground'
                        }`}
                      >
                        {hint}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[9.5px] uppercase tracking-[0.12em] ${
                          highlight ? 'text-primary-foreground/85' : 'text-foreground'
                        }`}
                      >
                        {language === 'ar' ? 'افتح' : language === 'en' ? 'Open →' : 'Ouvrir →'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFlipped(null);
                        }}
                        aria-label="retour"
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          highlight ? 'bg-background/25 text-primary-foreground' : 'bg-card text-primary'
                        }`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* User ID */}
        <div className="rounded-3xl bg-card p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('yourId')}</p>
          <code
            className="select-all break-all rounded-xl bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground"
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {user?.id}
          </code>
        </div>
      </div>
    </Layout>
  );
}

