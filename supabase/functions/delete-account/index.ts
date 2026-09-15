import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user from their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Cancel any active Stripe subscription before deleting the account,
    // so the customer is not billed again after account deletion.
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeSubscriptionId = user.app_metadata?.stripe_subscription_id as string | undefined;
    if (stripeSecretKey && stripeSubscriptionId) {
      try {
        const stripe = new Stripe(stripeSecretKey);
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      } catch (stripeError) {
        console.error("Stripe cancellation error:", stripeError);
        return new Response(JSON.stringify({ error: "Não foi possível cancelar a assinatura no Stripe." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Delete user data from all tables (order matters for FK constraints)
    await adminClient.from("appointments").delete().eq("user_id", user.id);
    await adminClient.from("staff").delete().eq("user_id", user.id);
    await adminClient.from("services").delete().eq("user_id", user.id);
    await adminClient.from("subscriptions").delete().eq("user_id", user.id);
    await adminClient.from("profiles").delete().eq("id", user.id);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
