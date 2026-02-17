import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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

      const { data, error: fnError } = await supabase.functions.invoke('handle-debt-approval', {
        body: { approval_token: token, action },
      });

      if (fnError || data?.error) {
        setError(data?.error || fnError?.message || 'Erreur lors du traitement.');
      } else {
        setResult(data.action);
      }
      setLoading(false);
    }
    process();
  }, [token, action]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          {loading && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
              <p className="text-lg">Traitement en cours...</p>
            </>
          )}
          {result === 'approved' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">Modification approuvée !</h2>
              <p className="text-muted-foreground">Les modifications ont été appliquées.</p>
            </>
          )}
          {result === 'rejected' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Modification refusée</h2>
              <p className="text-muted-foreground">La demande a été refusée.</p>
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
