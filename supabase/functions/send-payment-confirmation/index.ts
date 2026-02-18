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
    const { debtor_email, creditor_name, amount, currency, paid_at, notes, language } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFr = language !== "en";

    const paidDateStr = paid_at
      ? new Date(paid_at).toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
      : null;

    const subject = isFr
      ? `✅ Paiement confirmé — ${amount} ${currency} à ${creditor_name}`
      : `✅ Payment confirmed — ${amount} ${currency} to ${creditor_name}`;

    const notesLine = notes
      ? `<tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${isFr ? "Notes" : "Notes"}</td>
          <td style="padding: 8px 0; font-size: 14px;">${notes}</td>
        </tr>`
      : "";

    const paidDateLine = paidDateStr
      ? `<tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${isFr ? "Date de paiement" : "Payment date"}</td>
          <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${paidDateStr}</td>
        </tr>`
      : "";

    const emailHtml = `
<!DOCTYPE html>
<html lang="${isFr ? "fr" : "en"}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f7f4; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9f7f4; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%); padding: 36px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #c9a84c; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; font-family: Arial, sans-serif;">Mirath</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: normal; font-family: Georgia, serif; line-height: 1.4;">
                ${isFr ? "Paiement confirmé" : "Payment Confirmed"}
              </h1>
              <p style="margin: 12px 0 0 0; color: #86efac; font-size: 28px; line-height: 1;">✓</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6; font-family: Arial, sans-serif;">
                ${isFr
                  ? `Votre paiement à <strong>${creditor_name}</strong> a été confirmé et enregistré dans <strong>Mirath</strong>. Que Allah vous bénisse pour avoir honoré votre engagement.`
                  : `Your payment to <strong>${creditor_name}</strong> has been confirmed and recorded in <strong>Mirath</strong>. May Allah bless you for honoring your commitment.`
                }
              </p>

              <!-- Payment summary -->
              <table role="presentation" width="100%" style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin: 20px 0; font-family: Arial, sans-serif;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${isFr ? "Créancier" : "Creditor"}</td>
                  <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${creditor_name}</td>
                </tr>
                <tr style="background-color: #f0fdf4;">
                  <td style="padding: 10px 8px; color: #6b7280; font-size: 14px; border-radius: 6px 0 0 6px;">${isFr ? "Montant remboursé" : "Amount repaid"}</td>
                  <td style="padding: 10px 8px; font-size: 20px; font-weight: 700; color: #166534; border-radius: 0 6px 6px 0;">${amount} ${currency}</td>
                </tr>
                ${paidDateLine}
                ${notesLine}
              </table>

              <p style="margin: 0; color: #374151; font-size: 13px; font-family: Arial, sans-serif; line-height: 1.5;">
                ${isFr
                  ? "Cette confirmation est conservée de manière chiffrée dans l'application Mirath."
                  : "This confirmation is stored in encrypted form in the Mirath application."
                }
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="border-top: 1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Quranic verse section -->
          <tr>
            <td style="padding: 28px 32px 32px 32px; background-color: #fdfaf4;">

              <!-- Arabic label -->
              <p style="margin: 0 0 14px 0; text-align: center; color: #c9a84c; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-family: Arial, sans-serif; font-weight: 600;">
                ${isFr ? "Allah dit" : "Allah says"}
              </p>

              <!-- Arabic verse -->
              <p style="margin: 0 0 16px 0; text-align: center; font-size: 22px; line-height: 1.9; color: #1a1a2e; direction: rtl; font-family: 'Times New Roman', Georgia, serif; letter-spacing: 1px;">
                ﴿ يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ ﴾
              </p>

              <!-- French verse -->
              <blockquote style="margin: 0; padding: 16px 20px; border-left: 3px solid #c9a84c; background-color: #fffbf0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; line-height: 1.8; font-style: italic; font-family: Georgia, serif;">
                  « Ô vous qui avez cru ! Remplissez fidèlement vos engagements. »
                </p>
                <p style="margin: 0; color: #c9a84c; font-size: 12px; font-family: Arial, sans-serif; font-weight: 600; letter-spacing: 0.5px;">
                  — Sourate Al-Mâ'idah, 5:1
                </p>
              </blockquote>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px; font-family: Arial, sans-serif; line-height: 1.5;">
                🔒 ${isFr ? "Chiffré de bout en bout · AES-256-GCM" : "End-to-end encrypted · AES-256-GCM"}<br/>
                Mirath — ${isFr ? "Gestion sécurisée de l'héritage" : "Secure Legacy Management"}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mirath <noreply@mirath.app>",
        to: [debtor_email],
        subject,
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
