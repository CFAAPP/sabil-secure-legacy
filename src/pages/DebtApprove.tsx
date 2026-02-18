import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function DebtApprove() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action') as 'approve' | 'reject';

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function process() {
      if (!token || !action) {
        setError('Lien invalide.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-debt-approval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ approval_token: token, action }),
        });

        const data = await res.json();

        if (!res.ok || data?.error) {
          setError(data?.error || 'Erreur lors du traitement.');
        } else {
          setResult(data.action);
        }
      } catch (err: unknown) {
        setError('Erreur de connexion. Veuillez réessayer.');
      }

      setLoading(false);
    }
    process();
  }, [token, action]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {loading && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
              <p className="text-lg">Traitement en cours...</p>
            </>
          )}
          {result === 'approved' && (
            <>
              <CheckCircle className="h-14 w-14 text-primary mx-auto" />
              <h2 className="text-2xl font-semibold">Paiement confirmé !</h2>
              <p className="text-muted-foreground">
                Vous avez validé le paiement de cette dette. La dette a été marquée comme payée.
              </p>
            </>
          )}
          {result === 'rejected' && (
            <>
              <XCircle className="h-14 w-14 text-destructive mx-auto" />
              <h2 className="text-2xl font-semibold">Demande refusée</h2>
              <p className="text-muted-foreground">
                Vous avez refusé la demande de validation. La dette reste en attente.
              </p>
            </>
          )}
          {error && (
            <>
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-lg font-medium">{error}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
