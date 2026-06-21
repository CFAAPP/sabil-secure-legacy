import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, isRTL } from '@/lib/i18n';
import { Shield, FileText, Wallet, Users, Lock, UserCircle, Calculator, ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';

export default function Dashboard() {
  const { user, profile, language } = useAuth();
  const t = useTranslation(language);
  const rtl = isRTL(language);

  const cards = [
    {
      title: t('testament'),
      description: t('writeWill'),
      icon: FileText,
      path: '/testament',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-400/10',
    },
    {
      title: t('debts'),
      description: t('manageDebts'),
      icon: Wallet,
      path: '/debts',
      iconColor: 'text-gold',
      iconBg: 'bg-gold/10',
    },
    {
      title: t('contracts'),
      description: t('manageContracts'),
      icon: ScrollText,
      path: '/contracts',
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-400/10',
    },
    {
      title: t('wakils'),
      description: t('designateTrusted'),
      icon: Users,
      path: '/wakils',
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-400/10',
    },
    {
      title: 'Zakât al-Mâl',
      description: t('zakatCalc'),
      icon: Calculator,
      path: '/zakat',
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-400/10',
    },
    {
      title: t('profileHeirs'),
      description: t('prepareWill'),
      icon: UserCircle,
      path: '/profile',
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-400/10',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome header */}
        <div
          className="relative overflow-hidden rounded-2xl border border-primary/20 p-6"
          style={{ background: 'linear-gradient(135deg, hsl(155 28% 26%) 0%, hsl(155 22% 22%) 100%)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, hsl(43 62% 52%) 0%, transparent 70%)' }}
          />
          <p className="text-xs mb-2 font-arabic" style={{ color: 'hsl(43 62% 72%)' }}>
            بسم الله الرحمن الرحيم
          </p>
          <h1 className="font-serif text-3xl font-bold text-gold-gradient">
            {t('welcomeBack')},
          </h1>
          <p className="text-xl font-medium mt-0.5" style={{ color: 'hsl(38 30% 90%)' }}>
            {profile?.display_name || user?.email?.split('@')[0]}
          </p>
        </div>

        {/* Security status */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('securityStatus')}</p>
            <p className="text-xs text-muted-foreground">AES-256-GCM · {t('encrypted')} · E2E</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_hsl(142.1_76.2%_36.3%/0.6)] animate-pulse" />
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 pt-6 pb-5 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 no-underline shadow-sm"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg} border border-border`}
              >
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* User ID */}
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground mb-2">{t('yourId')}</p>
          <code
            className="text-xs text-muted-foreground/70 bg-muted/40 px-2 py-1 rounded-lg font-mono select-all break-all"
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {user?.id}
          </code>
        </div>
      </div>
    </Layout>
  );
}
