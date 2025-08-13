import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT } from 'npm:jose@5.6.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ✅ Helper to send responses with CORS every time
const withCORS = (body, status = 200) => {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
};

export const handler = async (req) => {
  // ✅ Handle preflight CORS
  if (req.method === 'OPTIONS') return withCORS('ok');

  if (req.method !== 'POST') return withCORS({ error: 'Method not allowed' }, 405);

  try {
    const { device_id, name } = await req.json();
    if (!device_id || !name) {
      return withCORS({ error: 'Missing fields' }, 400);
    }

    const supabaseUrl = 'https://ihuzpqoevnpwesqagsbv.supabase.co';
    const supabaseAnonKey = 'YOUR_ANON_KEY_HERE';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    // ✅ Get user from token
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return withCORS({ error: 'Unauthorized' }, 401);
    }

    // ✅ Insert device
    const { data: device, error } = await supabase
      .from('devices')
      .insert([{ device_id, name, owner_id: userData.user.id }])
      .select()
      .single();

    if (error) return withCORS({ error: error.message }, 400);

    // ✅ Sign device token
    const secret = new TextEncoder().encode('YOUR_SERVICE_ROLE_KEY_HERE');
    const payload = { device_id: device.device_id, owner_id: userData.user.id };
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10y')
      .sign(secret);

    return withCORS({ token, device });
  } catch (e) {
    return withCORS({ error: e?.message || 'Unexpected error' }, 500);
  }
};

export default handler;
