import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICE_CENTS = 1990;
const PLAN_NAME = "Agenda+Zap - Plano mensal";
const STRIPE_API_VERSION = "2025-04-30.basil";

async function stripeRequest(
  stripeSecretKey: string,
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Erro Stripe (${response.status})`,
    );
  }

  return data;
}

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

    // Evita criar uma segunda assinatura ativa.
    const existingSubscriptionId =
      user.app_metadata?.stripe_subscription_id as string | undefined;

    if (existingSubscriptionId) {
      try {
        const existing = await stripeRequest(
          stripeSecretKey,
          `/subscriptions/${encodeURIComponent(existingSubscriptionId)}`,
          { method: "GET" },
        );

        if (["active", "trialing", "past_due"].includes(existing.status)) {
          return new Response(
            JSON.stringify({ error: "Assinatura já existente" }),
            {
              status: 409,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            },
          );
        }
      } catch (error) {
        console.warn("Não foi possível verificar assinatura existente:", error);
      }
    }

    const body = await req.json().catch(() => ({}));

    const returnUrl =
      body.returnUrl ||
      req.headers.get("origin") ||
      "https://app.agendamaiszap.com.br/subscription";

    const successUrl = `${returnUrl}?success=true`;
    const cancelUrl = `${returnUrl}?canceled=true`;

    const configuredPriceId = Deno.env.get("STRIPE_PRICE_ID");
    const customerId =
      user.app_metadata?.stripe_customer_id as string | undefined;

    const params = new URLSearchParams();

    params.set("mode", "subscription");

    // FORÇA CARTÃO.
    params.set("payment_method_types[0]", "card");

    // DESATIVA O STRIPE LINK NESTA SESSÃO.
    // Enviado diretamente para a API Stripe usando a versão Basil,
    // evitando qualquer incompatibilidade do SDK.
    params.set("wallet_options[link][display]", "never");

    params.set("line_items[0][quantity]", "1");

    if (configuredPriceId) {
      params.set("line_items[0][price]", configuredPriceId);
    } else {
      params.set("line_items[0][price_data][currency]", "brl");
      params.set(
        "line_items[0][price_data][unit_amount]",
        String(PLAN_PRICE_CENTS),
      );
      params.set(
        "line_items[0][price_data][recurring][interval]",
        "month",
      );
      params.set(
        "line_items[0][price_data][product_data][name]",
        PLAN_NAME,
      );
      params.set(
        "line_items[0][price_data][product_data][description]",
        "Agenda+Zap - Sua agenda online!",
      );
    }

    // Se já existir Customer no Stripe, reutiliza.
    // Se não existir, NÃO enviamos customer_email:
    // o Checkout coleta o e-mail normalmente e evita iniciar o fluxo Link
    // automaticamente com um e-mail pré-preenchido.
    if (customerId) {
      params.set("customer", customerId);
    }

    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("client_reference_id", user.id);

    params.set("metadata[user_id]", user.id);
    params.set("metadata[plan]", "agenda-mais-zap-mensal-1990");

    params.set("subscription_data[metadata][user_id]", user.id);
    params.set(
      "subscription_data[metadata][plan]",
      "agenda-mais-zap-mensal-1990",
    );

    params.set("allow_promotion_codes", "false");
    params.set("billing_address_collection", "auto");

    const session = await stripeRequest(
      stripeSecretKey,
      "/checkout/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    if (!session?.url) {
      throw new Error("Stripe não retornou uma URL de checkout");
    }

    console.log("Stripe Checkout criado:", {
      id: session.id,
      payment_method_types: session.payment_method_types,
      wallet_options: session.wallet_options,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";

    console.error("create-checkout error:", error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
