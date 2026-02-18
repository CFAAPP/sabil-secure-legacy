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
    const { approval_token, action } = await req.json();

    if (!approval_token || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the modification request
    const { data: request, error: reqError } = await supabase
      .from("debt_modification_requests")
      .select("*")
      .eq("approval_token", approval_token)
      .eq("status", "pending")
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: "Request not found or already processed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      await supabase
        .from("debt_modification_requests")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", request.id);

      return new Response(JSON.stringify({ success: true, action: "rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Approve: update the share link visible data + the actual debt
    const updates: Record<string, string> = {};
    if (request.proposed_amount) updates.debtor_visible_amount = request.proposed_amount;
    if (request.proposed_currency) updates.debtor_visible_currency = request.proposed_currency;
    if (request.proposed_due_date) updates.debtor_visible_due_date = request.proposed_due_date;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("debt_share_links")
        .update(updates)
        .eq("id", request.share_link_id);
    }

    // Update the actual debt if status change is proposed
    if (request.proposed_status === "paid") {
      await supabase
        .from("debts")
        .update({ status: "paid", is_settled: true, paid_at: new Date().toISOString() })
        .eq("id", request.debt_id);
    }

    // Update the request status
    await supabase
      .from("debt_modification_requests")
      .update({ status: "approved", resolved_at: new Date().toISOString() })
      .eq("id", request.id);

    return new Response(JSON.stringify({ success: true, action: "approved" }), {
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
