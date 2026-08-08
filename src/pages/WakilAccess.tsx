import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { decrypt } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Eye, Lock, FileText, Wallet, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WakilAccess() {
  const [step, setStep] = useState<'auth' | 'passphrase' | 'data'>('auth');
  const [userId, setUserId] = useState('');
  const [wakilCode, setWakilCode] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [salt, setSalt] = useState('');
  const [rawTestament, setRawTestament] = useState<any>(null);
  const [rawDebts, setRawDebts] = useState<any[]>([]);
  const [testament, setTestament] = useState('');
  const [debts, setDebts] = useState<any[]>([]);
  const { toast } = useToast();

  const verifyAccess = async () => {
    setLoading(true);

    const { data, error } = await supabase.functions.invoke('wakil-access', {
      body: { user_id: userId, wakil_code: wakilCode },
    });

    if (error || data?.error) {
      toast({ title: 'Erreur', description: data?.error || 'Code Wakil invalide ou révoqué.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    setSalt(data.salt);
    setRawTestament(data.testament);
    setRawDebts(data.debts || []);
    setStep('passphrase');
    setLoading(false);
  };

  const decryptData = async () => {
    setLoading(true);

    try {
      if (rawTestament) {
        const decrypted = await decrypt(rawTestament.content_encrypted, rawTestament.iv, passphrase, salt);
        setTestament(decrypted);
      }

      const decryptedDebts = await Promise.all(
        rawDebts.map(async (d: any) => {
          try {
            const [description, amount, person] = await Promise.all([
              decrypt(d.description_encrypted, d.iv, passphrase, salt),
              decrypt(d.amount_encrypted, d.iv, passphrase, salt),
              decrypt(d.creditor_debtor_encrypted, d.iv, passphrase, salt),
            ]);
            return { ...d, description, amount, person };
          } catch {
            return null;
          }
        })
      );
      setDebts(decryptedDebts.filter(Boolean));
      setStep('data');
    } catch {
      toast({ title: 'Erreur', description: 'Phrase secrète incorrecte.', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background islamic-pattern px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 shadow-lg">
            <Shield className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold">Mode Wakil</h1>
          <p className="text-sm text-muted-foreground text-center">Accès en lecture seule aux données d'un proche</p>
        </div>

        {step === 'auth' && (
          <Card className="animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>ID utilisateur</Label>
                <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label>Code Wakil</Label>
                <Input value={wakilCode} onChange={(e) => setWakilCode(e.target.value.toUpperCase())} placeholder="ABCD1234" className="font-mono" />
              </div>
              <Button onClick={verifyAccess} className="w-full" disabled={loading || !userId || !wakilCode}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Vérification...' : 'Vérifier l\'accès'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'passphrase' && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Déchiffrement
              </CardTitle>
              <CardDescription>Entrez la phrase secrète du détenteur du coffre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Phrase secrète</Label>
                <Input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="••••••••••••" />
              </div>
              <Button onClick={decryptData} className="w-full" disabled={loading || !passphrase}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Déchiffrement...' : 'Déchiffrer les données'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'data' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm">
              <Eye className="h-4 w-4 text-accent" />
              <span className="text-accent font-medium">Lecture seule</span>
            </div>

            <Tabs defaultValue="testament">
              <TabsList className="w-full">
                <TabsTrigger value="testament" className="flex-1">
                  <FileText className="mr-1 h-4 w-4" />Testament
                </TabsTrigger>
                <TabsTrigger value="debts" className="flex-1">
                  <Wallet className="mr-1 h-4 w-4" />Dettes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="testament">
                <Card>
                  <CardContent className="pt-6">
                    {testament ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{testament}</div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Aucun testament trouvé</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="debts">
                <div className="space-y-3">
                  {debts.length ? debts.map((d: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="py-3 flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{d.description}</p>
                          <p className="text-xs text-muted-foreground">{d.person}</p>
                        </div>
                        <span className="text-sm font-medium">{d.amount}</span>
                        <span className="text-xs text-muted-foreground">{d.debt_type === 'i_owe' ? 'Doit' : 'Créance'}</span>
                      </CardContent>
                    </Card>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune dette trouvée</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
