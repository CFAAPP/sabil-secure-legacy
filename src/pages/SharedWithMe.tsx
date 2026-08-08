import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Coins, Inbox, Loader2, Calendar, AtSign } from 'lucide-react';

interface MentionRow {
  id: string;
  source_type: 'contract' | 'debt';
  source_id: string;
  mentioned_username: string;
  details: any;
  created_at: string;
}

export default function SharedWithMe() {
  const { user, language } = useAuth();
  const [items, setItems] = useState<MentionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('mentions')
        .select('*')
        .eq('mentioned_user_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });
      setItems((data as any) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const T = {
    fr: { title: 'PARTAGÉS AVEC MOI', empty: 'Aucun contrat ou dette partagé', contract: 'Contrat', debt: 'Dette' },
    en: { title: 'SHARED WITH ME', empty: 'No shared contract or debt', contract: 'Contract', debt: 'Debt' },
    ar: { title: 'المشترك معي', empty: 'لا يوجد عقد أو دين مشترك', contract: 'عقد', debt: 'دين' },
  }[language as 'fr' | 'en' | 'ar'] || {} as any;

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 pt-4 pb-4">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/15 border border-primary/20">
              <Inbox className="h-4 w-4 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground uppercase tracking-wider">{T.title}</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">{T.empty}</div>
        ) : (
          <div className="space-y-3">
            {items.map((m) => {
              const isContract = m.source_type === 'contract';
              const d = m.details || {};
              return (
                <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {isContract ? <FileText className="h-4 w-4 text-primary" /> : <Coins className="h-4 w-4 text-primary" />}
                    <span className="text-xs uppercase tracking-wide text-primary/80">{isContract ? T.contract : T.debt}</span>
                    <span className="ms-auto text-[11px] text-muted-foreground flex items-center gap-1">
                      <AtSign className="h-3 w-3" />{m.mentioned_username}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {isContract ? (d.title || '—') : (d.name || '—')}
                  </h3>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                    {isContract && d.contract_type && <div>Type : {d.contract_type}</div>}
                    {isContract && d.contract_date && <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{d.contract_date}</div>}
                    {isContract && Array.isArray(d.parties) && d.parties.length > 0 && (
                      <div>Parties : {d.parties.map((p: any) => p.name).filter(Boolean).join(', ')}</div>
                    )}
                    {isContract && d.execution_delay && <div>Délai : {d.execution_delay}</div>}
                    {isContract && d.clauses && <div className="whitespace-pre-wrap">Clauses : {d.clauses}</div>}
                    {isContract && d.penalties && <div className="whitespace-pre-wrap">Pénalités : {d.penalties}</div>}
                    {!isContract && d.amount && <div>Montant : {d.amount} {d.currency || ''}</div>}
                    {!isContract && d.dueDate && <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{d.dueDate}</div>}
                    {d.notes && <div className="whitespace-pre-wrap">Notes : {d.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
