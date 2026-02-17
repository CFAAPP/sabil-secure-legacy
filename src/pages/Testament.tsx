import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { encrypt, decrypt } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, FileText, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';

export default function Testament() {
  const { user, profile, passphrase, language } = useAuth();
  const t = useTranslation(language);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTestament();
  }, [user, passphrase]);

  const loadTestament = async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setLoading(true);

    const { data } = await supabase
      .from('vault_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', 'testament')
      .maybeSingle();

    if (data) {
      try {
        const decrypted = await decrypt(
          (data as any).content_encrypted,
          (data as any).iv,
          passphrase,
          profile.encryption_salt
        );
        setContent(decrypted);
        setExistingId(data.id);
      } catch {
        toast({ title: t('error'), description: 'Phrase secrète incorrecte.', variant: 'destructive' });
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !passphrase || !profile?.encryption_salt) return;
    setSaving(true);

    try {
      const { ciphertext, iv } = await encrypt(content, passphrase, profile.encryption_salt);

      if (existingId) {
        await supabase
          .from('vault_items')
          .update({
            content_encrypted: ciphertext,
            title_encrypted: ciphertext.slice(0, 50),
            iv,
          } as any)
          .eq('id', existingId);
      } else {
        const { data } = await supabase
          .from('vault_items')
          .insert({
            user_id: user.id,
            item_type: 'testament',
            content_encrypted: ciphertext,
            title_encrypted: ciphertext.slice(0, 50),
            iv,
          } as any)
          .select()
          .single();
        if (data) setExistingId(data.id);
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: existingId ? 'testament_updated' : 'testament_created',
        entity_type: 'vault_items',
        entity_id: existingId,
      } as any);

      toast({ title: t('success'), description: t('saved') });
    } catch (err) {
      toast({ title: t('error'), description: 'Erreur lors de la sauvegarde.', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="font-serif text-2xl font-bold">{t('testamentTitle')}</h1>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? t('saving') : t('save')}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('testamentPlaceholder')}
                className="min-h-[400px] resize-none border-0 bg-transparent text-base leading-relaxed focus-visible:ring-0"
              />
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          🔒 {language === 'fr' ? 'Chiffré de bout en bout — AES-256-GCM' : 'End-to-end encrypted — AES-256-GCM'}
        </p>
      </div>
    </Layout>
  );
}
