import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface ShareLink {
  id: string;
  debt_id: string;
  debtor_visible_name: string;
  debtor_visible_amount: string;
  debtor_visible_currency: string;
  debtor_visible_due_date: string | null;
  is_active: boolean;
}

export default function DebtEdit() {
  const { token } = useParams<{ token: string }>();
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      if (!token) return;
      const { data, error } = await supabase.functions.invoke('get-debt-share-link', {
        body: { share_token: token },
      });

      if (error || !data?.share_link) {
        setError('Lien invalide ou expiré.');
      } else {
        const sl = data.share_link as ShareLink;
        setShareLink(sl);
        setAmount(sl.debtor_visible_amount);
        setCurrency(sl.debtor_visible_currency);
        setDueDate(sl.debtor_visible_due_date || '');
      }
      setLoading(false);
    }
    load();
  }, [token]);

  const handleSubmit = async () => {
    if (!shareLink) return;
    setSubmitting(true);

    try {
      // Insert modification request
      const { data: req, error: insertErr } = await supabase
        .from('debt_modification_requests')
        .insert({
          share_link_id: shareLink.id,
          debt_id: shareLink.debt_id,
          proposed_amount: amount !== shareLink.debtor_visible_amount ? amount : null,
          proposed_currency: currency !== shareLink.debtor_visible_currency ? currency : null,
          proposed_due_date: dueDate !== (shareLink.debtor_visible_due_date || '') ? dueDate || null : null,
          proposed_status: status || null,
          proposed_notes: notes || null,
          debtor_message: message || null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Trigger email
      const appUrl = window.location.origin;
      await supabase.functions.invoke('send-approval-email', {
        body: { modification_request_id: req.id, app_url: appUrl },
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !shareLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Demande envoyée !</h2>
            <p className="text-muted-foreground">
              Le créancier recevra un email pour valider ou refuser vos modifications.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="font-display">Modifier la dette</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dette envers <strong>{shareLink!.debtor_visible_name}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Montant</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label>Devise</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date d'échéance</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <div className="flex gap-2">
              <Button variant={status === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('paid')}>
                Payée
              </Button>
              <Button variant={status === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('pending')}>
                En attente
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ajoutez des notes..." />
          </div>

          <div className="space-y-1.5">
            <Label>Message au créancier</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Expliquez votre demande..." />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer la demande de modification
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Le créancier devra approuver vos modifications par email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
