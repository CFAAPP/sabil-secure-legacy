import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateSalt } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function PassphraseSetup() {
  const { user, profile, setPassphrase, refreshProfile, language } = useAuth();
  const t = useTranslation(language);
  const isSetup = !profile?.encryption_salt;
  const [phrase, setPhrase] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    if (isSetup) {
      if (phrase !== confirmPhrase) {
        toast({ title: t('error'), description: 'Les phrases ne correspondent pas.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (phrase.length < 8) {
        toast({ title: t('error'), description: 'La phrase doit faire au moins 8 caractères.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const salt = generateSalt();
      const { error } = await supabase
        .from('profiles')
        .update({ encryption_salt: salt } as any)
        .eq('user_id', user.id);

      if (error) {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      await refreshProfile();
      setPassphrase(phrase);
    } else {
      // Just unlock with existing passphrase
      setPassphrase(phrase);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background islamic-pattern px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isSetup ? t('createPassphrase') : t('enterPassphrase')}
          </h1>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardDescription className="text-center">
              {t('passphraseHint')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t('passphraseWarning')}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{isSetup ? t('createPassphrase') : t('enterPassphrase')}</Label>
                <Input
                  type="password"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                />
              </div>
              {isSetup && (
                <div className="space-y-2">
                  <Label>{t('confirmPin').replace('PIN', 'phrase')}</Label>
                  <Input
                    type="password"
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('loading') : isSetup ? t('confirm') : 'Déverrouiller'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
