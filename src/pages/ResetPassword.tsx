import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import hisabLogo from '@/assets/hisab-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation, type Language } from '@/lib/i18n';

export default function ResetPassword() {
  const [language] = useState<Language>(() => {
    const stored = localStorage.getItem('mirath-lang');
    return (stored === 'fr' || stored === 'en' || stored === 'ar') ? stored : 'fr';
  });
  const t = useTranslation(language);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery event in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: t('error'), description: t('phraseMismatch'), variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: t('error'), description: t('phraseMinLength'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: t('error'), description: t('resetError'), variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('resetSuccess') });
      setTimeout(() => navigate('/'), 2000);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background islamic-pattern px-4">
        <div className="w-full max-w-md animate-fade-in text-center">
          <img src={hisabLogo} alt="Hisab" className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-lg mb-6" />
          <p className="text-muted-foreground mb-4">{t('loading')}</p>
          <Link to="/" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background islamic-pattern px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={hisabLogo} alt="Hisab" className="h-20 w-20 rounded-2xl object-cover shadow-lg" />
          <h1 className="font-display text-3xl font-bold text-foreground">{language === 'ar' ? 'حساب' : 'Hisab'}</h1>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">{t('resetPassword')}</CardTitle>
            <CardDescription>{t('newPassword')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('newPassword')}</Label>
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
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
              <Button type="submit" className="w-full" disabled={loading}>
                <KeyRound className="mr-2 h-4 w-4" />
                {loading ? t('loading') : t('resetPassword')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                {t('backToLogin')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
