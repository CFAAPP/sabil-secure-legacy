import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { modification_request_id, app_url } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the modification request with share link info
    const { data: request, error: reqError } = await supabase
      .from("debt_modification_requests")
      .select("*, debt_share_links(*)")
      .eq("id", modification_request_id)
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shareLink = request.debt_share_links;
    const approveUrl = `${app_url}/debt-approve/${request.approval_token}?action=approve`;
    const rejectUrl = `${app_url}/debt-approve/${request.approval_token}?action=reject`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build changes summary
    const changes: string[] = [];
    if (request.proposed_amount) changes.push(`Montant: ${request.proposed_amount} ${request.proposed_currency || shareLink.debtor_visible_currency}`);
    if (request.proposed_due_date) changes.push(`Échéance: ${request.proposed_due_date}`);
    if (request.proposed_status) changes.push(`Statut: ${request.proposed_status === "paid" ? "Payée" : "En attente"}`);
    if (request.proposed_notes) changes.push(`Notes: ${request.proposed_notes}`);
    if (request.debtor_message) changes.push(`Message: ${request.debtor_message}`);

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Demande de modification de dette</h2>
        <p>Le débiteur <strong>${shareLink.debtor_visible_name}</strong> demande les modifications suivantes sur la dette de <strong>${shareLink.debtor_visible_amount} ${shareLink.debtor_visible_currency}</strong> :</p>
        <ul style="background: #f5f5f5; padding: 16px 24px; border-radius: 8px;">
          ${changes.map((c) => `<li style="margin: 4px 0;">${c}</li>`).join("")}
        </ul>
        <div style="margin-top: 24px; display: flex; gap: 12px;">
          <a href="${approveUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">✅ Approuver</a>
          <a href="${rejectUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-left: 12px;">❌ Refuser</a>
        </div>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">Ce lien est unique et expire après utilisation.</p>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sabeel <onboarding@resend.dev>",
        to: [shareLink.creditor_email],
        subject: `Demande de modification - Dette ${shareLink.debtor_visible_name}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      return new Response(JSON.stringify({ error: "Failed to send email", details: emailResult }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
