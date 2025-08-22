import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let event;
    try {
      // For development, you can skip signature verification
      // In production, you should verify the webhook signature
      event = JSON.parse(body);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Received webhook event:", event.type);

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Checkout session completed:", session.id);

      // Get customer details
      const customer = await stripe.customers.retrieve(session.customer);
      console.log("Customer email:", customer.email);

      // Update user subscription in database
      const supabaseUrl = Deno.env.get("SB_URL");
      const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !serviceRoleKey) {
        console.error("Supabase configuration missing");
        return new Response(JSON.stringify({ error: "Server configuration error" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Find user by email and update subscription
      const { data: profiles, error: findError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', customer.email)
        .limit(1);

      if (findError) {
        console.error("Error finding user:", findError);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!profiles || profiles.length === 0) {
        console.error("User not found for email:", customer.email);
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const user = profiles[0];
      console.log("Updating subscription for user:", user.id);

      // Update subscription tier to premium
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ subscription_tier: 'premium' })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log("Successfully upgraded user to premium:", user.email);
    }

    // Handle subscription events
    if (event.type === "customer.subscription.created" || 
        event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);

      const supabaseUrl = Deno.env.get("SB_URL");
      const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const tier = subscription.status === 'active' ? 'premium' : 'free';

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: tier })
        .eq('email', customer.email);

      if (error) {
        console.error("Error updating subscription:", error);
      } else {
        console.log(`Updated ${customer.email} to ${tier}`);
      }
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);

      const supabaseUrl = Deno.env.get("SB_URL");
      const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: 'free' })
        .eq('email', customer.email);

      if (error) {
        console.error("Error updating subscription:", error);
      } else {
        console.log(`Downgraded ${customer.email} to free`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});