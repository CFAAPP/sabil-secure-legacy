import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { generateWakilCode } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Copy, XCircle, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';

interface Wakil {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  wakil_code: string;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
}

export default function Wakils() {
  const { user, language } = useAuth();
  const t = useTranslation(language);
  const [wakils, setWakils] = useState<Wakil[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWakil, setNewWakil] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadWakils();
  }, [user]);

  const loadWakils = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('wakils')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setWakils(data as Wakil[]);
    setLoading(false);
  };

  const addWakil = async () => {
    if (!user) return;
    setSaving(true);

    const code = generateWakilCode();
    const { error } = await supabase.from('wakils').insert({
      user_id: user.id,
      name: newWakil.name,
      email: newWakil.email || null,
      phone: newWakil.phone || null,
      wakil_code: code,
    } as any);

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'wakil_added',
        entity_type: 'wakils',
      } as any);
      setDialogOpen(false);
      setNewWakil({ name: '', email: '', phone: '' });
      await loadWakils();
      toast({ title: t('success') });
    }
    setSaving(false);
  };

  const revokeWakil = async (id: string) => {
    await supabase.from('wakils').update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    } as any).eq('id', id);

    await supabase.from('audit_logs').insert({
      user_id: user!.id,
      action: 'wakil_revoked',
      entity_type: 'wakils',
      entity_id: id,
    } as any);

    await loadWakils();
    toast({ title: t('success') });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: t('codeCopied') });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="font-serif text-2xl font-bold">{t('wakilsTitle')}</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />{t('addWakil')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">{t('addWakil')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('wakilName')}</Label>
                  <Input value={newWakil.name} onChange={(e) => setNewWakil({ ...newWakil, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('wakilEmail')}</Label>
                  <Input type="email" value={newWakil.email} onChange={(e) => setNewWakil({ ...newWakil, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('wakilPhone')}</Label>
                  <Input value={newWakil.phone} onChange={(e) => setNewWakil({ ...newWakil, phone: e.target.value })} />
                </div>
                <Button onClick={addWakil} className="w-full" disabled={saving || !newWakil.name}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('confirm')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !wakils.length ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            {language === 'fr' ? 'Aucun Wakil désigné' : 'No Wakils designated'}
          </p>
        ) : (
          <div className="space-y-3">
            {wakils.map((wakil) => (
              <Card key={wakil.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{wakil.name}</p>
                      {wakil.email && <p className="text-xs text-muted-foreground">{wakil.email}</p>}
                      {wakil.phone && <p className="text-xs text-muted-foreground">{wakil.phone}</p>}
                    </div>
                    <Badge variant={wakil.is_active ? 'default' : 'secondary'}>
                      {wakil.is_active ? t('activeWakil') : t('revokedWakil')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <span className="text-xs text-muted-foreground">{t('wakilCode')}:</span>
                    <code className="flex-1 text-sm font-mono select-all">{wakil.wakil_code}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(wakil.wakil_code)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  {wakil.is_active && (
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => revokeWakil(wakil.id)}>
                      <XCircle className="mr-1 h-4 w-4" />
                      {t('revokeWakil')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
