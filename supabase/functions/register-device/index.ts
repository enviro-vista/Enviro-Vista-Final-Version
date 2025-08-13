import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT } from 'npm:jose@5.6.3';
// Use environment variables for sensitive data
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://ihuzpqoevnpwesqagsbv.supabase.co';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodXpwcW9ldm5wd2VzcWFnc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzYzNzUsImV4cCI6MjA3MDQxMjM3NX0.XoM0YSz7fr1uKbNAf9FooBHb1rIBgjDtL4rGysacGg4';
const jwtSecret = Deno.env.get('JWT_SECRET') || 't3fYXmyny2Hvf+ZBd4jUp3ixZRySEnNtx7iArRZuCdqtmtBR7KvNLn/4G957qBHDnK1uovHokQITGQF8behvVA==';
// Allowed origins - update with your production domain
const allowedOrigins = [
  'https://climate-pulse-suite.vercel.app',
  'http://localhost:3000'
];
// Helper function to set CORS headers
const setCorsHeaders = (req)=>{
  const origin = req.headers.get('Origin') || '';
  const headers = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
  // Set allowed origin if in whitelist
  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
};
export const handler = async (req)=>{
  const corsHeaders = setCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  try {
    const { device_id, name } = await req.json();
    if (!device_id || !name) {
      return new Response(JSON.stringify({
        error: 'Missing fields'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? ''
        }
      }
    });
    // Validate user auth
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Insert new device
    const { data: device, error } = await supabase.from('devices').insert([
      {
        device_id,
        name,
        owner_id: userData.user.id
      }
    ]).select().single();
    if (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Sign device JWT
    const secret = new TextEncoder().encode(jwtSecret);
    const payload = {
      device_id: device.device_id,
      owner_id: userData.user.id
    };
    const token = await new SignJWT(payload).setProtectedHeader({
      alg: 'HS256'
    }).setExpirationTime('10y').sign(secret);
    return new Response(JSON.stringify({
      token,
      device
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: e?.message || 'Unexpected error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};
export default handler;
