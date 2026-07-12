import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = Deno.env.get("APP_URL") || "https://sabil-secure-legacy.lovable.app";

function htmlPage(title: string, body: string, color = "#2d3a2a") {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,sans-serif;background:#faf7f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
  <div style="max-width:480px;background:#fff;border:1px solid #e7ddc5;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06);">
    <h1 style="color:${color};margin:0 0 12px;font-size:22px;">${title}</h1>
    <p style="color:#555;line-height:1.5;">${body}</p>
    <a href="${APP_URL}" style="display:inline-block;margin-top:20px;background:#5a7a4a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Mirath</a>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action");

  if (!token || !action || !['accept', 'refuse'].includes(action)) {
    return new Response(htmlPage("Lien invalide", "Le lien est incorrect ou incomplet.", "#b04a4a"),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: mention } = await admin.from('mentions').select('*').eq('response_token', token).maybeSingle();
  if (!mention) {
    return new Response(htmlPage("Lien introuvable", "Ce lien a déjà été utilisé ou n'existe pas.", "#b04a4a"),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  }
  if (mention.status !== 'pending') {
    return new Response(htmlPage("Déjà traité", `Cette invitation a déjà été ${mention.status === 'accepted' ? 'acceptée' : 'refusée'}.`),
      { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  }

  const kind = mention.source_type === 'contract' ? 'contrat' : 'dette';

  if (action === 'accept') {
    await admin.from('mentions').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', mention.id);
    return new Response(
      htmlPage("Invitation acceptée ✓",
        `Vous avez accepté d'être ajouté à ce ${kind}. Il apparaît maintenant dans votre application Mirath, onglet « Partagés avec moi ».`),
      { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
  }

  // Refuse: delete mention (retrait automatique) then notify owner
  await admin.from('mentions').delete().eq('id', mention.id);

  try {
    const { data: ownerRes } = await admin.auth.admin.getUserById(mention.owner_user_id);
    const ownerEmail = ownerRes?.user?.email;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (ownerEmail && RESEND_API_KEY) {
      const html = `
        <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#2d3a2a;">Mention refusée</h2>
          <p>L'utilisateur <strong>@${mention.mentioned_username}</strong> a refusé d'être associé à votre ${kind}.</p>
          <p>La mention a été automatiquement retirée de votre ${kind}.</p>
          <p style="color:#888;font-size:12px;margin-top:24px;">Mirath</p>
        </div>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Mirath <noreply@mirath.app>",
          to: [ownerEmail],
          subject: `[Mirath] @${mention.mentioned_username} a refusé votre ${kind}`,
          html,
        }),
      });
    }
  } catch (e) { console.error('notify owner failed', e); }

  return new Response(
    htmlPage("Invitation refusée",
      `Vous avez refusé cette invitation. L'expéditeur a été informé et la mention a été retirée.`, "#b04a4a"),
    { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
});
