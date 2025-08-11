import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jwtVerify } from 'npm:jose@5.6.3';

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

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body = await req.json();
    const { device_id, temperature, humidity, pressure } = body ?? {};

    if (!device_id || typeof temperature !== 'number' || typeof humidity !== 'number' || typeof pressure !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const token = authHeader.split(' ')[1];
    const secretEnv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!secretEnv) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const secret = new TextEncoder().encode(secretEnv);

    const { payload: decoded } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    if ((decoded as any)?.device_id !== device_id) {
      return new Response(JSON.stringify({ error: 'Device ID mismatch' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Calculate dew point using provided formula
    const dew_point = temperature - ((100 - humidity) / 5);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = secretEnv; // Use service role for DB ops
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Find the device UUID by its public device_id
    const { data: device, error: deviceErr } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('device_id', device_id)
      .single();

    if (deviceErr || !device) {
      return new Response(JSON.stringify({ error: 'Device not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { error: insertErr } = await supabaseAdmin.from('readings').insert({
      device_id: device.id,
      temperature,
      humidity,
      pressure,
      dew_point,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ message: 'Data stored successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// Ensure default export for Supabase Edge Functions
export default handler;
