import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, isRTL } from '@/lib/i18n';
import { FileText, Wallet, Users, Lock, UserCircle, Calculator, ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useIdentity } from '@/hooks/useIdentity';

export default function Dashboard() {
  const { user, profile, language } = useAuth();
  const t = useTranslation(language);
  const rtl = isRTL(language);
  const { formalName, isComplete } = useIdentity();

  const isSecure = Boolean(user && profile?.encryption_salt && isComplete);

  const cards = [
    { title: t('testament'), arabic: 'وَصِيَّتِي', description: t('writeWill'), icon: FileText, path: '/testament' },
    { title: t('debts'), arabic: 'دُيُونِي', description: t('manageDebts'), icon: Wallet, path: '/debts' },
    { title: t('contracts'), arabic: 'عُقُودِي', description: t('manageContracts'), icon: ScrollText, path: '/contracts' },
    { title: 'Zakât al-Mâl', arabic: 'زَكَاةُ المَال', description: t('zakatCalc'), icon: Calculator, path: '/zakat' },
    { title: t('wakils'), arabic: 'وُكَلَائِي', description: t('designateTrusted'), icon: Users, path: '/wakils' },
    { title: t('profileHeirs'), arabic: 'مَعْلُومَاتِي', description: t('prepareWill'), icon: UserCircle, path: '/profile' },
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

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card, i) => {
            const highlight = i === 0;
            return (
              <Link
                key={card.path}
                to={card.path}
                className={`group relative block overflow-hidden rounded-[26px] border no-underline transition-all duration-300 active:scale-[0.98] ${
                  highlight
                    ? 'border-primary bg-gradient-gold shadow-gold'
                    : 'border-primary/25 bg-gradient-card hover:border-primary/60'
                }`}
              >
                {/* Fine mesh texture */}
                <div className={`pointer-events-none absolute inset-0 mihrab-mesh ${highlight ? 'opacity-30' : 'opacity-60'}`} />
                {/* Skyline silhouette */}
                <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 mihrab-skyline ${highlight ? 'opacity-40' : 'opacity-70'}`} />
                {/* Arch frame */}
                <div
                  className={`pointer-events-none absolute inset-x-3 top-3 bottom-10 mihrab-arch border ${
                    highlight ? 'border-primary-foreground/25' : 'border-primary/35'
                  }`}
                />

                <div className="relative flex flex-col items-center px-4 pt-5 pb-5 text-center">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-[14px] border ${
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
                    className={`font-arabic mt-4 text-2xl leading-none ${
                      highlight ? 'text-primary-foreground' : 'text-gold-gradient'
                    }`}
                    dir="rtl"
                  >
                    {card.arabic}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className={`h-px w-6 ${highlight ? 'bg-primary-foreground/30' : 'bg-primary/30'}`} />
                    <span className={`text-[9px] ${highlight ? 'text-primary-foreground/50' : 'text-primary/50'}`}>✦</span>
                    <span className={`h-px w-6 ${highlight ? 'bg-primary-foreground/30' : 'bg-primary/30'}`} />
                  </div>

                  <h3
                    className={`font-display mt-3 text-[13px] leading-tight tracking-[0.06em] ${
                      highlight ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`mt-1 text-[10px] leading-snug line-clamp-2 ${
                      highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {card.description}
                  </p>
                </div>
              </Link>
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
