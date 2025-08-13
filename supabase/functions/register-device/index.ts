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
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodXpwcW9ldm5wd2VzcWFnc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzYzNzUsImV4cCI6MjA3MDQxMjM3NX0.XoM0YSz7fr1uKbNAf9FooBHb1rIBgjDtL4rGysacGg4';
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
    const secret = new TextEncoder().encode('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodXpwcW9ldm5wd2VzcWFnc2J2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDgzNjM3NSwiZXhwIjoyMDcwNDEyMzc1fQ.paG3HH1oe2FT3FeWVy-fXkZMM5SdtCFcq6f-17y1hRU');
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
