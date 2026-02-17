import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileText, Wallet, Users, Lock } from 'lucide-react';
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
      color: 'text-primary',
    },
    {
      title: t('debts'),
      description: language === 'fr' ? 'Gérez vos dettes et créances' : 'Manage your debts and credits',
      icon: Wallet,
      path: '/debts',
      color: 'text-sabeel-gold',
    },
    {
      title: t('wakils'),
      description: language === 'fr' ? 'Désignez vos personnes de confiance' : 'Designate your trusted ones',
      icon: Users,
      path: '/wakils',
      color: 'text-primary',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            {t('welcomeBack')}, {profile?.display_name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            بسم الله الرحمن الرحيم
          </p>
        </div>

        {/* Security status */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t('securityStatus')}</p>
              <p className="text-xs text-muted-foreground">
                AES-256-GCM • {t('encrypted')} • E2E
              </p>
            </div>
            <Shield className="ml-auto h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        {/* Feature cards */}
        <div className="grid gap-4">
          {cards.map((card) => (
            <Link key={card.path} to={card.path}>
              <Card className="transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* User ID for Wakil sharing */}
        <Card className="border-sabeel-gold/20">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'fr' ? 'Votre ID (à partager avec vos Wakils)' : 'Your ID (share with your Wakils)'}
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono select-all">
              {user?.id}
            </code>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
