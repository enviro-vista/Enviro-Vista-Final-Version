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

    // Get environment variables
    const supabaseUrl = Deno.env.get("SB_URL");
    const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    console.log("Environment check:");
    console.log("- Supabase URL:", !!supabaseUrl);
    console.log("- Service role key:", !!serviceRoleKey);
    console.log("- Stripe key:", !!stripeKey);
    console.log("- Stripe key length:", stripeKey?.length || 0);

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe secret key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create client for authentication
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

    console.log("User authenticated:", user.email);

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body = await req.json();
    const { tier = "premium", billing = "monthly" } = body;

    console.log("Creating checkout for tier:", tier, "billing:", billing);

    // Check if customer exists or create new one
    let customer;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length > 0) {
      customer = customers.data[0];
      console.log("Found existing customer:", customer.id);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      console.log("Created new customer:", customer.id);
    }

    // Define pricing based on billing period
    const prices = {
      monthly: {
        amount: 999, // $9.99
        interval: "month",
        description: "Billed monthly"
      },
      yearly: {
        amount: 9999, // $99.99
        interval: "year", 
        description: "Billed annually (≈$8.33/month)"
      }
    };

    const selectedPrice = prices[billing as keyof typeof prices] || prices.monthly;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Premium Subscription (${billing === "yearly" ? "Annual" : "Monthly"})`,
              description: `Access to VPD, PAR, UV-index, and Weather Trend analysis. ${selectedPrice.description}`
            },
            unit_amount: selectedPrice.amount,
            recurring: {
              interval: selectedPrice.interval as "month" | "year"
            }
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin") || "http://localhost:3000"}/?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
      cancel_url: `${req.headers.get("origin") || "http://localhost:3000"}/?upgrade=cancelled`,
      // Note: In production, you'd set up a proper webhook endpoint
      // For now, we'll handle this via the success URL
    });

    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify({
      success: true,
      message: "Subscription initiated",
      checkout_url: session.url,
      tier,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});