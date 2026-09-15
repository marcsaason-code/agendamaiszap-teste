import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const stripeStatusIsActive = (status: Stripe.Subscription.Status) =>
  status === "active" || status === "trialing";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response("Server configuration incomplete", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing Stripe signature", { status: 400 });
    }

    const rawBody = await req.text();
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id || session.client_reference_id || undefined;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

      if (userId) {
        const { data: existing } = await adminClient
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const payload = {
          status: "active",
          paid_at: new Date().toISOString(),
        };

        if (existing) {
          await adminClient.from("subscriptions").update(payload).eq("user_id", userId);
        } else {
          await adminClient.from("subscriptions").insert({ user_id: userId, ...payload });
        }

        const { data: userData } = await adminClient.auth.admin.getUserById(userId);
        const currentAppMetadata = userData?.user?.app_metadata ?? {};
        await adminClient.auth.admin.updateUserById(userId, {
          app_metadata: {
            ...currentAppMetadata,
            ...(customerId ? { stripe_customer_id: customerId } : {}),
            ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
          },
        });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const isActive = event.type !== "customer.subscription.deleted" && stripeStatusIsActive(subscription.status);
        const { data: existing } = await adminClient
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const payload = {
          status: isActive ? "active" : "expired",
          ...(isActive ? { paid_at: new Date().toISOString() } : {}),
        };

        if (existing) {
          await adminClient.from("subscriptions").update(payload).eq("user_id", userId);
        } else {
          await adminClient.from("subscriptions").insert({ user_id: userId, ...payload });
        }

        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
        const { data: userData } = await adminClient.auth.admin.getUserById(userId);
        const currentAppMetadata = userData?.user?.app_metadata ?? {};
        await adminClient.auth.admin.updateUserById(userId, {
          app_metadata: {
            ...currentAppMetadata,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
          },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    console.error("stripe-webhook error:", error);
    return new Response(message, { status: 400 });
  }
});
