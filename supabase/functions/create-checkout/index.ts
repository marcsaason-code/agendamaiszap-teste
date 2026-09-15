import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICE_CENTS = 1990; // R$ 19,90/mês
const PLAN_NAME = "Agenda+Zap - Plano mensal";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !stripeSecretKey) {
      throw new Error("Configuração do Stripe/Supabase incompleta");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Avoid creating a second active subscription for the same account.
    const existingSubscriptionId = user.app_metadata?.stripe_subscription_id as string | undefined;
    if (existingSubscriptionId) {
      try {
        const existing = await stripe.subscriptions.retrieve(existingSubscriptionId);
        if (["active", "trialing", "past_due"].includes(existing.status)) {
          return new Response(JSON.stringify({ error: "Assinatura já existente" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (error) {
        console.warn("Could not verify existing Stripe subscription:", error);
      }
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = body.returnUrl || req.headers.get("origin") || "https://app.agendamaiszap.com.br/subscription";
    const successUrl = `${returnUrl}?success=true`;
    const cancelUrl = `${returnUrl}?canceled=true`;

    const configuredPriceId = Deno.env.get("STRIPE_PRICE_ID");
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = configuredPriceId
      ? { price: configuredPriceId, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: PLAN_PRICE_CENTS,
            recurring: { interval: "month" },
            product_data: {
              name: PLAN_NAME,
              description: "Agenda online com link público de agendamento",
            },
          },
        };

    const customerId = user.app_metadata?.stripe_customer_id as string | undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(customerId ? { customer: customerId } : { customer_email: user.email || undefined }),
      line_items: [lineItem],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan: "agenda-mais-zap-mensal-1990",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "agenda-mais-zap-mensal-1990",
        },
      },
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    if (!session.url) {
      throw new Error("Stripe não retornou uma URL de checkout");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
