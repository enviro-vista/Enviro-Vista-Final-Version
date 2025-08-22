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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "Session ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log("Session status:", session.payment_status);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get customer details
    const customer = await stripe.customers.retrieve(session.customer as string);
    console.log("Customer email:", customer.email);

    // Get user from auth header
    const supabaseUrl = Deno.env.get("SB_URL");
    const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SB_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the customer email matches the authenticated user
    if (customer.email !== user.email) {
      return new Response(JSON.stringify({ error: "Customer email mismatch" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update user subscription in database
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    return new Response(JSON.stringify({
      success: true,
      message: "Subscription upgraded successfully",
      subscription_tier: "premium"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});