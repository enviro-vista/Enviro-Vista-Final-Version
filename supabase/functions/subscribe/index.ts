import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SB_URL')!;
    const supabaseKey = Deno.env.get('SB_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await req.json();
    const { tier = 'premium' } = body;

    // PLACEHOLDER: Log the subscription request
    console.log('Subscription request received:', {
      userId: user.id,
      email: user.email,
      tier,
      timestamp: new Date().toISOString(),
    });

    // PLACEHOLDER: Mock Stripe integration
    // In a real implementation, you would:
    // 1. Create a Stripe checkout session
    // 2. Handle the payment webhook
    // 3. Update the user's subscription tier

    // For now, simulate successful payment and upgrade user
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!
    );

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // PLACEHOLDER: Return mock Stripe checkout URL
    const mockCheckoutUrl = `https://checkout.stripe.com/mock?user=${user.id}&tier=${tier}`;

    return new Response(JSON.stringify({ 
      message: 'Subscription initiated (PLACEHOLDER)',
      checkout_url: mockCheckoutUrl,
      tier,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export default handler;
