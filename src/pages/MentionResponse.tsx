import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// This page proxies the token to the edge function which returns full HTML.
// We redirect the browser to it so the user gets the confirmation page.
export default function MentionResponse() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    const action = params.get('action');
    if (!token || !action) {
      setError('Lien invalide');
      return;
    }
    const base = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
    window.location.replace(`${base}/functions/v1/respond-to-mention?token=${encodeURIComponent(token)}&action=${encodeURIComponent(action)}`);
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      )}
    </div>
  );
}
