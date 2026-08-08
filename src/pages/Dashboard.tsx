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
  const { formalName } = useIdentity();

  const cards = [
    { title: t('testament'), description: t('writeWill'), icon: FileText, path: '/testament' },
    { title: t('debts'), description: t('manageDebts'), icon: Wallet, path: '/debts' },
    { title: t('contracts'), description: t('manageContracts'), icon: ScrollText, path: '/contracts' },
    { title: 'Zakât al-Mâl', description: t('zakatCalc'), icon: Calculator, path: '/zakat' },
    { title: t('wakils'), description: t('designateTrusted'), icon: Users, path: '/wakils' },
    { title: t('profileHeirs'), description: t('prepareWill'), icon: UserCircle, path: '/profile' },
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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t('securityStatus')}</p>
            <p className="text-[11px] text-muted-foreground">AES-256-GCM · {t('encrypted')} · E2E</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.9)] animate-pulse" />
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card, i) => {
            const highlight = i === 0;
            return (
              <Link
                key={card.path}
                to={card.path}
                className={`group relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border p-5 text-center no-underline transition-all duration-300 active:scale-[0.98] ${
                  highlight
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div
                  className={`flex h-[72px] w-[72px] items-center justify-center rounded-[22px] ${
                    highlight ? 'bg-primary-foreground/10' : 'bg-primary/12'
                  }`}
                >
                  <card.icon
                    className={`h-8 w-8 ${highlight ? 'text-primary-foreground' : 'text-primary'}`}
                    strokeWidth={1.6}
                  />
                </div>
                <div className="space-y-1.5">
                  <h3
                    className={`font-display text-base leading-tight ${
                      highlight ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`text-[11px] leading-snug line-clamp-2 ${
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
