import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, FileText, Wallet, Users, Lock, ChevronRight, UserCircle, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';

export default function Dashboard() {
  const { user, profile, language } = useAuth();
  const t = useTranslation(language);

  const cards = [
    {
      title: t('testament'),
      description: language === 'fr' ? 'Rédigez et sécurisez votre testament' : 'Write and secure your will',
      icon: FileText,
      path: '/testament',
      iconColor: 'text-blue-400',
      glowColor: 'hsl(210 80% 55% / 0.15)',
    },
    {
      title: t('debts'),
      description: language === 'fr' ? 'Gérez vos dettes et créances' : 'Manage your debts and credits',
      icon: Wallet,
      path: '/debts',
      iconColor: 'text-gold',
      glowColor: 'hsl(43 72% 58% / 0.15)',
    },
    {
      title: t('wakils'),
      description: language === 'fr' ? 'Désignez vos personnes de confiance' : 'Designate your trusted ones',
      icon: Users,
      path: '/wakils',
      iconColor: 'text-emerald-400',
      glowColor: 'hsl(155 60% 45% / 0.15)',
    },
    {
      title: 'Zakât al-Mâl',
      description: language === 'fr' ? 'Calculez et gérez votre Zakât annuelle' : 'Calculate and manage your annual Zakât',
      icon: Calculator,
      path: '/zakat',
      iconColor: 'text-amber-400',
      glowColor: 'hsl(38 80% 55% / 0.15)',
    },
    {
      title: language === 'fr' ? 'Profil & Héritiers' : 'Profile & Heirs',
      description: language === 'fr' ? 'Préparez votre testament islamique' : 'Prepare your Islamic will',
      icon: UserCircle,
      path: '/profile',
      iconColor: 'text-violet-400',
      glowColor: 'hsl(270 60% 55% / 0.15)',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome header */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 p-6 bg-primary/8"
          style={{ background: 'linear-gradient(135deg, hsl(155 28% 26%) 0%, hsl(155 22% 22%) 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, hsl(43 62% 52%) 0%, transparent 70%)' }} />
          <p className="text-xs mb-2 font-arabic" style={{ color: 'hsl(43 62% 72%)' }}>بسم الله الرحمن الرحيم</p>
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
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_hsl(142_71%_45%/0.6)] animate-pulse" />
        </div>

        {/* Feature cards */}
        <div className="grid gap-3">
          {cards.map((card) => (
            <Link key={card.path} to={card.path}>
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-md cursor-pointer shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted border border-border">
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* User ID */}
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground mb-2">
            {language === 'fr' ? 'Votre ID (à partager avec vos Wakils)' : 'Your ID (share with your Wakils)'}
          </p>
          <code className="text-xs text-muted-foreground/70 bg-muted/40 px-2 py-1 rounded-lg font-mono select-all break-all">
            {user?.id}
          </code>
        </div>
      </div>
    </Layout>
  );
}
