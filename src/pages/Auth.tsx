import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import mirathLogo from '@/assets/mirath-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation, LANGUAGE_LABELS, type Language } from '@/lib/i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export default function Auth() {
  const { language, setLanguage } = useAuth();
  const t = useTranslation(language);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      toast({ title: t('error'), description: t('phraseMismatch'), variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: t('error'), description: t('loginError'), variant: 'destructive' });
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
      } else {
        toast({ title: t('success'), description: t('signupSuccess') });
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background islamic-pattern px-4">
      {/* Language toggle top-right */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="fixed top-4 right-4 z-50 text-xs text-muted-foreground hover:text-gold hover:bg-gold/5 tracking-widest font-medium gap-1"
          >
            <Globe className="h-3.5 w-3.5" />
            {LANGUAGE_LABELS[language]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          {(['fr', 'en', 'ar'] as Language[]).map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => setLanguage(lang)}
              className={language === lang ? 'bg-gold/10 text-gold font-medium' : ''}
            >
              {LANGUAGE_LABELS[lang]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={mirathLogo} alt="Mirath" className="h-20 w-20 rounded-2xl object-cover shadow-lg" />
          <h1 className="font-serif text-3xl font-bold text-foreground">{language === 'ar' ? 'ميراث' : 'Mirath'}</h1>
          <p className="text-sm text-muted-foreground">{t('appTagline')}</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-xl">
              {isLogin ? t('login') : t('signup')}
            </CardTitle>
            <CardDescription>
              {isLogin ? t('accessVault') : t('protectWishes')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                <Shield className="mr-2 h-4 w-4" />
                {loading ? t('loading') : isLogin ? t('login') : t('signup')}
              </Button>
            </form>

            {isLogin && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      toast({ title: t('error'), description: t('email'), variant: 'destructive' });
                      return;
                    }
                    setLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) {
                      toast({ title: t('error'), description: t('resetError'), variant: 'destructive' });
                    } else {
                      toast({ title: t('success'), description: t('resetEmailSent') });
                    }
                    setLoading(false);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  {t('forgotPassword')}
                </button>
              </div>
            )}

            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline"
              >
                {isLogin ? t('noAccountCreate') : t('hasAccountLogin')}
              </button>
            </div>

            <div className="mt-4 border-t border-border pt-4 text-center">
              <Link
                to="/wakil-access"
                className="text-sm text-accent hover:underline inline-flex items-center gap-1"
              >
                <Shield className="h-3 w-3" />
                {t('wakilAccessLink')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
