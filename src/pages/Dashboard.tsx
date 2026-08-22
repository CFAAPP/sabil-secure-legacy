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
    { title: t('wakils'), arabic: 'وُكَلَائِي', description: t('designateTrusted'), icon: Users, path: '/wakils' },
    { title: t('profileHeirs'), arabic: 'مَعْلُومَاتِي', description: t('prepareWill'), icon: User, path: '/profile' },
  ];


  return (
    <Layout>
      <div className="space-y-4 animate-fade-in">
        {/* Welcome header */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
          <div
            className="absolute -top-16 -right-12 w-52 h-52 rounded-full opacity-[0.18] blur-2xl"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
          />
          <p className="text-[11px] mb-3 font-arabic text-primary/70">بسم الله الرحمن الرحيم</p>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{t('welcomeBack')}</p>
          <h1 className="font-display text-2xl mt-1.5 text-foreground leading-tight">
            {formalName || profile?.display_name || user?.email?.split('@')[0]}
          </h1>
        </div>

        {/* Security status */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isSecure ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
            <Lock className={`h-4 w-4 ${isSecure ? 'text-emerald-500' : 'text-red-500'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t('securityStatus')}</p>
            <p className="text-[11px] text-muted-foreground">
              {isSecure ? t('securitySecure') : t('securityAtRisk')} · AES-256-GCM · {t('encrypted')} · E2E
            </p>
          </div>
          <div
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              isSecure
                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)]'
                : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.85)]'
            }`}
            aria-label={isSecure ? t('securitySecure') : t('securityAtRisk')}
          />
        </div>

        {/* Rappel prophétique sur la promptitude du testament */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card/70 px-4 py-3.5">
          <div className="pointer-events-none absolute inset-0 mihrab-mesh opacity-30" />
          <div className="relative flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <ScrollText className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-quran text-[15px] leading-loose text-primary/90" dir="rtl">
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
              <div key={card.path} className="flip-perspective h-[236px]">
                <div className={`flip-inner relative h-full w-full ${isFlipped ? 'is-flipped' : ''}`}>
                  {/* Front */}
                  <button
                    type="button"
                    onClick={() => setFlipped(card.path)}
                    aria-label={card.title}
                    className={`flip-face absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-[26px] border text-center transition-colors duration-300 active:scale-[0.99] ${
                      highlight
                        ? 'border-primary bg-gradient-gold shadow-gold'
                        : 'border-primary/25 bg-gradient-card hover:border-primary/60'
                    }`}
                  >
                    <div className={`pointer-events-none absolute inset-0 mihrab-mesh ${highlight ? 'opacity-30' : 'opacity-60'}`} />
                    <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 mihrab-skyline ${highlight ? 'opacity-40' : 'opacity-70'}`} />
                    <div
                      className={`pointer-events-none absolute inset-x-2.5 top-2.5 bottom-2.5 mihrab-arch border ${
                        highlight ? 'border-primary-foreground/25' : 'border-primary/35'
                      }`}
                    />

                    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-3 px-5 py-5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-[13px] border ${
                          highlight
                            ? 'border-primary-foreground/25 bg-primary-foreground/10'
                            : 'border-primary/35 bg-primary/10'
                        }`}
                      >
                        <card.icon
                          className={`h-5 w-5 ${highlight ? 'text-primary-foreground' : 'text-primary'}`}
                          strokeWidth={1.5}
                        />
                      </div>

                      <p
                        className={`font-arabic text-xl leading-none ${
                          highlight ? 'text-primary-foreground' : 'text-gold-gradient'
                        }`}
                        dir="rtl"
                      >
                        {card.arabic}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className={`h-px w-5 ${highlight ? 'bg-primary-foreground/30' : 'bg-primary/30'}`} />
                        <span className={`text-[9px] ${highlight ? 'text-primary-foreground/50' : 'text-primary/50'}`}>✦</span>
                        <span className={`h-px w-5 ${highlight ? 'bg-primary-foreground/30' : 'bg-primary/30'}`} />
                      </div>

                      <h3
                        className={`font-display px-0.5 text-[15px] leading-[1.15] tracking-[0.04em] ${
                          highlight ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {card.title}
                      </h3>
                    </div>
                  </button>

                  {/* Back */}
                  <Link
                    to={card.path}
                    className={`flip-face flip-back absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[26px] border px-4 py-4 no-underline ${
                      highlight ? 'border-primary bg-gradient-gold' : 'border-primary/40 bg-gradient-card'
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 mihrab-mesh opacity-25" />
                    <div className="relative">
                      <p
                        className={`font-display text-[15px] leading-[1.15] uppercase tracking-[0.04em] ${
                          highlight ? 'text-primary-foreground/80' : 'text-primary'
                        }`}
                      >
                        {card.title}
                      </p>
                      <p
                        className={`mt-2.5 text-[11.5px] leading-relaxed ${
                          highlight ? 'text-primary-foreground/85' : 'text-muted-foreground'
                        }`}
                      >
                        {hint}
                      </p>
                    </div>
                    <div className="relative mt-3 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFlipped(null);
                        }}
                        aria-label="retour"
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                          highlight
                            ? 'border-primary-foreground/30 text-primary-foreground'
                            : 'border-primary/40 text-primary hover:bg-primary/10'
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
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{t('yourId')}</p>
          <code
            className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg font-mono select-all break-all"
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {user?.id}
          </code>
        </div>
      </div>
    </Layout>
  );
}
