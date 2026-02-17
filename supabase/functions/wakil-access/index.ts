import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, wakil_code } = await req.json();

    if (!user_id || !wakil_code) {
      return new Response(JSON.stringify({ error: 'Missing user_id or wakil_code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify wakil code
    const { data: wakil, error: wakilError } = await supabaseAdmin
      .from('wakils')
      .select('*')
      .eq('user_id', user_id)
      .eq('wakil_code', wakil_code)
      .eq('is_active', true)
      .maybeSingle();

    if (wakilError || !wakil) {
      return new Response(JSON.stringify({ error: 'Invalid or revoked wakil code' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get profile (for salt)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('encryption_salt')
      .eq('user_id', user_id)
      .single();

    // Get testament
    const { data: testament } = await supabaseAdmin
      .from('vault_items')
      .select('content_encrypted, iv')
      .eq('user_id', user_id)
      .eq('item_type', 'testament')
      .maybeSingle();

    // Get debts
    const { data: debts } = await supabaseAdmin
      .from('debts')
      .select('description_encrypted, amount_encrypted, creditor_debtor_encrypted, iv, debt_type, is_settled')
      .eq('user_id', user_id);

    // Log access
    await supabaseAdmin.from('audit_logs').insert({
      user_id,
      action: 'wakil_access',
      metadata: { wakil_code },
    });

    return new Response(JSON.stringify({
      salt: profile?.encryption_salt,
      testament,
      debts: debts || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
