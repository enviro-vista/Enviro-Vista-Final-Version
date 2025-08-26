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
    console.log("Session:", session);

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

    // Store transaction data in stripe_transactions table
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    try {
      console.log("Storing transaction data...");
      
      // Get subscription details to extract next billing date
      let nextBillingDate: string | null = null;
      if (session.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();
          console.log("Next billing date:", nextBillingDate);
        } catch (subError) {
          console.error("Error fetching subscription:", subError);
        }
      }
      
      // Check if transaction already exists to prevent duplicates
      const { data: existingTransaction } = await supabase
        .from('stripe_transactions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .single();
      
      if (existingTransaction) {
        console.log("Transaction already exists, skipping duplicate storage");
      } else {
        const { error: transactionError } = await supabase
          .from('stripe_transactions')
          .insert([{
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent,
            customer_email: customer.email,
            customer_id: session.customer,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            status: session.payment_status,
            subscription_id: session.subscription,
            billing_cycle: session.mode === 'subscription' ? 'monthly' : 'one-time',
            next_billing_date: nextBillingDate,
            product_name: 'Premium Subscription'
          }]);

        if (transactionError) {
          console.error("Error storing transaction:", transactionError);
          // Continue with subscription update even if transaction storage fails
        } else {
          console.log("Transaction stored successfully");
        }
      }
    } catch (error) {
      console.error("Error in transaction storage:", error);
      // Continue with subscription update
    }

    // Update user subscription in database
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
      subscription_tier: "premium",
      session: session
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