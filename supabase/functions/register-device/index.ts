import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT } from 'npm:jose@5.6.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ✅ Handle OPTIONS first (preflight CORS check)
export const handler = async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const { device_id, name } = await req.json();
    if (!device_id || !name) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = 'https://ihuzpqoevnpwesqagsbv.supabase.co';
    const supabaseAnonKey = 'YOUR_ANON_KEY_HERE';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    });

    // ✅ Get user from token
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ✅ Insert device
    const { data: device, error } = await supabase
      .from('devices')
      .insert([{ device_id, name, owner_id: userData.user.id }])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ✅ Sign device token
    const secret = new TextEncoder().encode('YOUR_SERVICE_ROLE_KEY_HERE');
    const payload = { device_id: device.device_id, owner_id: userData.user.id };
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10y')
      .sign(secret);

    return new Response(JSON.stringify({ token, device }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export default handler;
