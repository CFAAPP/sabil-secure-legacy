import { supabase } from '@/integrations/supabase/client';

export type MentionSource = 'contract' | 'debt';

export interface MentionDetailsContract {
  contract_type?: string;
  title?: string;
  contract_date?: string;
  parties?: { name: string; role: string }[];
  execution_delay?: string;
  clauses?: string;
  penalties?: string;
  witnesses?: { name: string; contact: string }[];
  notes?: string;
}

export interface MentionDetailsDebt {
  type?: 'i_owe' | 'owed_to_me';
  name?: string;
  amount?: string;
  currency?: string;
  dueDate?: string;
  notes?: string;
}

/** Parse "@alice, @bob  charlie" into ["alice","bob","charlie"] */
export function parseUsernames(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,;]+/)
        .map((s) => s.trim().replace(/^@+/, '').toLowerCase())
        .filter((s) => /^[a-z0-9_.]{3,30}$/.test(s)),
    ),
  );
}

export function serializeUsernames(list: string[]): string {
  return list.map((u) => `@${u}`).join(' ');
}

async function lookupUserId(username: string): Promise<string | null> {
  const { data } = await supabase.rpc('lookup_user_by_username', { _username: username });
  return (data as string | null) ?? null;
}

/**
 * Sync mention rows for a given source. Returns { unknown } list of usernames
 * that don't correspond to an existing account (skipped).
 */
export async function syncMentions(params: {
  ownerUserId: string;
  sourceType: MentionSource;
  sourceId: string;
  usernames: string[];
  details: MentionDetailsContract | MentionDetailsDebt;
  language: string;
  senderDisplay?: string;
}): Promise<{ unknown: string[]; added: number }> {
  const { ownerUserId, sourceType, sourceId, usernames, details, language, senderDisplay } = params;

  const wantedMap = new Map<string, string>(); // user_id -> username
  const unknown: string[] = [];
  for (const u of usernames) {
    if (!u) continue;
    const uid = await lookupUserId(u);
    if (uid && uid !== ownerUserId) wantedMap.set(uid, u);
    else if (!uid) unknown.push(u);
  }

  // Existing
  const { data: existing } = await supabase
    .from('mentions')
    .select('id, mentioned_user_id')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  const existingMap = new Map<string, string>((existing || []).map((r: any) => [r.mentioned_user_id, r.id]));

  // Delete removed
  const toDelete = [...existingMap.entries()]
    .filter(([uid]) => !wantedMap.has(uid))
    .map(([, id]) => id);
  if (toDelete.length) {
    await supabase.from('mentions').delete().in('id', toDelete);
  }

  // Insert new
  let added = 0;
  for (const [uid, username] of wantedMap.entries()) {
    if (existingMap.has(uid)) continue;
    const { data: inserted, error } = await supabase
      .from('mentions')
      .insert({
        source_type: sourceType,
        source_id: sourceId,
        owner_user_id: ownerUserId,
        mentioned_user_id: uid,
        mentioned_username: username,
        details: details as any,
      })
      .select('id')
      .single();
    if (!error && inserted) {
      added++;
      // Fire-and-forget invitation email
      supabase.functions
        .invoke('send-mention-invitation', {
          body: { mention_id: inserted.id, language, sender_display: senderDisplay },
        })
        .catch((e) => console.error('mention email failed', e));
    }
  }

  return { unknown, added };
}

export async function loadMentionUsernames(sourceType: MentionSource, sourceId: string): Promise<string[]> {
  const { data } = await supabase
    .from('mentions')
    .select('mentioned_username')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);
  return (data || []).map((r: any) => r.mentioned_username);
}
