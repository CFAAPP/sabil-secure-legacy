import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Language } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';
import type { DebtItem } from './DebtCard';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  debt: DebtItem | null;
}

export default function ShareDebtDialog({ open, onOpenChange, language, debt }: Props) {
  const t = useTranslation(language);
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!debt) return null;

  const handleGenerate = async () => {
    if (!user || !email.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('debt_share_links')
        .insert({
          debt_id: debt.id,
          user_id: user.id,
          debtor_visible_name: debt.name,
          debtor_visible_amount: debt.amount,
          debtor_visible_currency: debt.currency,
          debtor_visible_due_date: debt.due_date,
          creditor_email: email,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/debt-edit/${data.share_token}`;
      setShareUrl(url);
    } catch (err: any) {
      toast({ title: t('error'), variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast({ title: language === 'fr' ? 'Lien copié !' : 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setShareUrl(''); setEmail(''); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {language === 'fr' ? 'Partager avec le débiteur' : 'Share with debtor'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? 'Générez un lien que le débiteur pourra utiliser pour proposer des modifications. Vous devrez les approuver par email.'
              : 'Generate a link the debtor can use to propose changes. You will need to approve them via email.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!shareUrl ? (
            <>
              <div className="space-y-1.5">
                <Label>{language === 'fr' ? 'Votre email (pour recevoir les validations)' : 'Your email (for validations)'}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                />
              </div>
              <Button onClick={handleGenerate} className="w-full" disabled={loading || !email.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Link className="mr-2 h-4 w-4" />
                {language === 'fr' ? 'Générer le lien' : 'Generate link'}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Label>{language === 'fr' ? 'Lien de partage' : 'Share link'}</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'fr'
                  ? 'Envoyez ce lien au débiteur. Il pourra proposer des modifications que vous devrez valider par email.'
                  : 'Send this link to the debtor. They can propose changes that you will need to validate via email.'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
