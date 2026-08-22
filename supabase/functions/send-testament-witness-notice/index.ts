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
    const { witnessName, witnessEmail, testatorName, depositDate, language } = await req.json();

    if (!witnessEmail) {
      return new Response(JSON.stringify({ error: "Missing witness email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "ar" ? "ar" : language === "en" ? "en" : "fr";
    const isAr = lang === "ar";

    const L = {
      fr: {
        subject: `Vous avez été désigné comme témoin d'un testament`,
        hello: `Assalamu alaykum ${witnessName || ""},`.trim(),
        body: `Vous avez été désigné comme témoin du testament de ${testatorName || "—"}, déposé le ${depositDate || "—"}.`,
        privacy:
          "Aucun contenu patrimonial n'est communiqué dans cet email. Votre rôle est uniquement d'attester de l'existence de ce testament.",
        footer: "Mirath — message automatique, merci de ne pas répondre.",
      },
      en: {
        subject: `You have been appointed as a witness to a will`,
        hello: `Assalamu alaykum ${witnessName || ""},`.trim(),
        body: `You have been appointed as a witness to the will of ${testatorName || "—"}, deposited on ${depositDate || "—"}.`,
        privacy:
          "No asset information is disclosed in this email. Your role is solely to attest to the existence of this will.",
        footer: "Mirath — automated message, please do not reply.",
      },
      ar: {
        subject: `تم تعيينك شاهداً على وصية`,
        hello: `السلام عليكم ${witnessName || ""}،`.trim(),
        body: `تم تعيينك شاهداً على وصية ${testatorName || "—"}، المودعة بتاريخ ${depositDate || "—"}.`,
        privacy: "لا يتضمن هذا البريد أي تفاصيل مالية. دورك هو الشهادة على وجود هذه الوصية فقط.",
        footer: "ميراث — رسالة آلية، يرجى عدم الرد.",
      },
    }[lang];

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? "rtl" : "ltr"}">
<head><meta charset="UTF-8" /><title>${L.subject}</title></head>
<body style="margin:0;padding:0;background-color:#f9f7f4;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9f7f4;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#1c1a18;padding:24px;text-align:center;color:#d9b571;font-size:20px;letter-spacing:2px;">MIRATH</td></tr>
        <tr><td style="padding:28px;color:#1f2937;font-size:15px;line-height:1.7;text-align:${isAr ? "right" : "left"};">
          <p style="margin:0 0 14px;">${L.hello}</p>
          <p style="margin:0 0 14px;font-weight:600;">${L.body}</p>
          <p style="margin:0;color:#6b7280;font-size:13px;">${L.privacy}</p>
        </td></tr>
        <tr><td style="padding:16px;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #eee;">${L.footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mirath <noreply@mirath.app>",
        to: [witnessEmail],
        subject: L.subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend error", detail);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
