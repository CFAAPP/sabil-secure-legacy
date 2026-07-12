import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = Deno.env.get("APP_URL") || "https://sabil-secure-legacy.lovable.app";

function fmtContract(d: any, lang: string) {
  const L = lang === 'ar' ? {
    type: 'النوع', title: 'الموضوع', date: 'التاريخ', parties: 'الأطراف', delay: 'المهلة',
    clauses: 'البنود', penalties: 'الغرامات', witnesses: 'الشهود', notes: 'ملاحظات',
  } : lang === 'en' ? {
    type: 'Type', title: 'Subject', date: 'Date', parties: 'Parties', delay: 'Delay',
    clauses: 'Clauses', penalties: 'Penalties', witnesses: 'Witnesses', notes: 'Notes',
  } : {
    type: 'Type', title: 'Objet', date: 'Date', parties: 'Parties', delay: 'Délai',
    clauses: 'Clauses', penalties: 'Pénalités', witnesses: 'Témoins', notes: 'Notes',
  };
  const rows: string[] = [];
  const add = (k: string, v: any) => v && rows.push(`<tr><td style="padding:6px 12px;color:#7a6a4a;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">${k}</td><td style="padding:6px 12px;color:#1a1a1a;">${v}</td></tr>`);
  add(L.type, d.contract_type);
  add(L.title, d.title);
  add(L.date, d.contract_date);
  if (Array.isArray(d.parties) && d.parties.length)
    add(L.parties, d.parties.map((p: any) => `${p.name || ''}${p.role ? ` (${p.role})` : ''}`).join(', '));
  add(L.delay, d.execution_delay);
  add(L.clauses, (d.clauses || '').replace(/\n/g, '<br/>'));
  add(L.penalties, (d.penalties || '').replace(/\n/g, '<br/>'));
  if (Array.isArray(d.witnesses) && d.witnesses.length)
    add(L.witnesses, d.witnesses.map((w: any) => w.name).filter(Boolean).join(', '));
  add(L.notes, (d.notes || '').replace(/\n/g, '<br/>'));
  return `<table style="width:100%;border-collapse:collapse;background:#faf7f0;border:1px solid #e7ddc5;border-radius:8px;margin-top:12px;">${rows.join('')}</table>`;
}

function fmtDebt(d: any, lang: string) {
  const L = lang === 'ar' ? {
    kind: 'النوع', name: 'الاسم', amount: 'المبلغ', due: 'تاريخ الاستحقاق', notes: 'ملاحظات',
    iOwe: 'أنا مدين', owedToMe: 'مستحق لي',
  } : lang === 'en' ? {
    kind: 'Type', name: 'Counterparty', amount: 'Amount', due: 'Due date', notes: 'Notes',
    iOwe: 'I owe', owedToMe: 'Owed to me',
  } : {
    kind: 'Type', name: 'Contrepartie', amount: 'Montant', due: 'Échéance', notes: 'Notes',
    iOwe: 'Je dois', owedToMe: 'On me doit',
  };
  const rows: string[] = [];
  const add = (k: string, v: any) => v && rows.push(`<tr><td style="padding:6px 12px;color:#7a6a4a;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">${k}</td><td style="padding:6px 12px;color:#1a1a1a;">${v}</td></tr>`);
  add(L.kind, d.type === 'i_owe' ? L.iOwe : L.owedToMe);
  add(L.name, d.name);
  add(L.amount, `${d.amount} ${d.currency || ''}`);
  add(L.due, d.dueDate);
  add(L.notes, (d.notes || '').replace(/\n/g, '<br/>'));
  return `<table style="width:100%;border-collapse:collapse;background:#faf7f0;border:1px solid #e7ddc5;border-radius:8px;margin-top:12px;">${rows.join('')}</table>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mention_id, language = 'fr', sender_display } = await req.json();
    if (!mention_id) {
      return new Response(JSON.stringify({ error: "mention_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth check: require a valid session and verify caller owns the mention
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: userData } = await admin.auth.getUser(jwt);
    const caller = userData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: mention, error } = await admin
      .from('mentions').select('*').eq('id', mention_id).single();
    if (error || !mention) {
      return new Response(JSON.stringify({ error: "mention not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (mention.owner_user_id !== caller.id) {
      return new Response(JSON.stringify({ error: "forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up recipient email (never exposed to sender)
    const { data: userRes } = await admin.auth.admin.getUserById(mention.mentioned_user_id);
    const recipientEmail = userRes?.user?.email;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "recipient email unavailable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isAr = language === 'ar';
    const isEn = language === 'en';
    const acceptUrl = `${APP_URL}/mention-response?token=${mention.response_token}&action=accept`;
    const refuseUrl = `${APP_URL}/mention-response?token=${mention.response_token}&action=refuse`;

    const heading = mention.source_type === 'contract'
      ? (isAr ? 'تمت إضافتك إلى عقد' : isEn ? 'You have been added to a contract' : 'Vous avez été ajouté à un contrat')
      : (isAr ? 'تمت إضافتك إلى دَين' : isEn ? 'You have been added to a debt' : 'Vous avez été ajouté à une dette');
    const intro = isAr
      ? `أضافك <strong>${sender_display || 'مستخدم'}</strong> باسم <strong>@${mention.mentioned_username}</strong>. يمكنك القبول ليظهر في تطبيقك، أو الرفض.`
      : isEn
        ? `<strong>${sender_display || 'A user'}</strong> mentioned you as <strong>@${mention.mentioned_username}</strong>. You can accept to see it in your app, or refuse.`
        : `<strong>${sender_display || 'Un utilisateur'}</strong> vous a mentionné en tant que <strong>@${mention.mentioned_username}</strong>. Vous pouvez accepter pour le retrouver dans votre application, ou refuser.`;
    const acceptLabel = isAr ? '✅ قبول' : isEn ? '✅ Accept' : '✅ Accepter';
    const refuseLabel = isAr ? '❌ رفض' : isEn ? '❌ Refuse' : '❌ Refuser';

    const detailsHtml = mention.source_type === 'contract'
      ? fmtContract(mention.details || {}, language)
      : fmtDebt(mention.details || {}, language);

    const html = `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
        <div style="border-bottom:2px solid #c9a86a;padding-bottom:12px;margin-bottom:16px;">
          <h1 style="margin:0;color:#2d3a2a;font-size:20px;">Mirath</h1>
        </div>
        <h2 style="color:#2d3a2a;font-size:18px;">${heading}</h2>
        <p style="color:#3a3a3a;line-height:1.5;">${intro}</p>
        ${detailsHtml}
        <div style="margin-top:24px;text-align:center;">
          <a href="${acceptUrl}" style="display:inline-block;background:#5a7a4a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:4px 6px;">${acceptLabel}</a>
          <a href="${refuseUrl}" style="display:inline-block;background:#b04a4a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:4px 6px;">${refuseLabel}</a>
        </div>
        <p style="margin-top:24px;color:#8a8a8a;font-size:11px;text-align:center;">Mirath — ${isAr ? 'رابط آمن للاستخدام مرة واحدة' : isEn ? 'Secure one-time link' : 'Lien sécurisé à usage unique'}</p>
      </div>`;

    const subject = mention.source_type === 'contract'
      ? (isAr ? `[Mirath] عقد جديد باسم @${mention.mentioned_username}` : isEn ? `[Mirath] New contract mentioning @${mention.mentioned_username}` : `[Mirath] Nouveau contrat mentionnant @${mention.mentioned_username}`)
      : (isAr ? `[Mirath] دَين جديد باسم @${mention.mentioned_username}` : isEn ? `[Mirath] New debt mentioning @${mention.mentioned_username}` : `[Mirath] Nouvelle dette mentionnant @${mention.mentioned_username}`);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Mirath <noreply@mirath.app>",
        to: [recipientEmail],
        subject,
        html,
      }),
    });
    const emailResult = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      return new Response(JSON.stringify({ error: "failed to send", details: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-mention-invitation error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
