import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jwtVerify } from 'npm:jose@5.6.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions for calculated metrics
function calculateDewPoint(temp: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
}

function calculateHeatIndex(temp: number, humidity: number): number {
  const c1 = -42.379;
  const c2 = 2.04901523;
  const c3 = 10.14333127;
  const c4 = -0.22475541;
  const c5 = -0.00683783;
  const c6 = -0.05481717;
  const c7 = 0.00122874;
  const c8 = 0.00085282;
  const c9 = -0.00000199;

  const t = temp * 9 / 5 + 32; // Convert to Fahrenheit
  const rh = humidity;

  const hi = c1 + (c2 * t) + (c3 * rh) + (c4 * t * rh) +
    (c5 * t * t) + (c6 * rh * rh) + (c7 * t * t * rh) +
    (c8 * t * rh * rh) + (c9 * t * t * rh * rh);

  return (hi - 32) * 5 / 9; // Convert back to Celsius
}

function calculateVPD(temp: number, humidity: number): number {
  const satVP = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const actualVP = satVP * (humidity / 100);
  return satVP - actualVP;
}

function calculateAbsoluteHumidity(temp: number, humidity: number): number {
  const satVP = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const actualVP = satVP * (humidity / 100);
  return (actualVP * 1000 * 18.016) / (8.314 * (temp + 273.15));
}

function calculatePAR(light: number): number {
  // Approximate conversion from lux to PAR (μmol/m²/s)
  return light * 0.0185;
}

function calculateSoilMoisture(capacitance: number): number {
  // Convert capacitance to moisture percentage (calibration-dependent)
  const minCap = 320; // Dry soil
  const maxCap = 590; // Wet soil
  return Math.max(0, Math.min(100, ((capacitance - minCap) / (maxCap - minCap)) * 100));
}

function calculateBatteryHealth(voltage: number, percentage: number): number {
  // Simple battery health calculation
  const expectedVoltage = 3.3 + (percentage / 100) * 0.9; // 3.3-4.2V range
  const voltageDiff = Math.abs(voltage - expectedVoltage);
  return Math.max(0, 100 - (voltageDiff * 50));
}

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
    const { device_id, timestamp, raw, calculated } = body ?? {};

    if (!device_id || !raw) {
      return new Response(JSON.stringify({ error: 'Invalid payload: device_id and raw data required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const token = authHeader.split(' ')[1];
    const secretEnv = Deno.env.get('SB_SERVICE_ROLE_KEY');
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

    const supabaseUrl = Deno.env.get('SB_URL')!;
    const serviceKey = secretEnv;
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

    // Prepare sensor reading data
    const sensorData: any = {
      device_id: device.id,
      timestamp: timestamp || new Date().toISOString(),
      // Raw readings
      temperature: raw.temperature,
      humidity: raw.humidity,
      pressure: raw.pressure,
      co2: raw.co2,
      light_veml7700: raw.light_veml7700,
      light_tsl2591: raw.light_tsl2591,
      acceleration_x: raw.acceleration_x,
      acceleration_y: raw.acceleration_y,
      acceleration_z: raw.acceleration_z,
      soil_capacitance: raw.soil_capacitance,
      battery_voltage: raw.battery_voltage,
      battery_percentage: raw.battery_percentage,
    };

    // Calculate missing metrics if not provided
    if (raw.temperature !== undefined && raw.humidity !== undefined) {
      sensorData.dew_point = calculated?.dew_point ?? calculateDewPoint(raw.temperature, raw.humidity);
      sensorData.heat_index = calculated?.heat_index ?? calculateHeatIndex(raw.temperature, raw.humidity);
      sensorData.vpd = calculated?.vpd ?? calculateVPD(raw.temperature, raw.humidity);
      sensorData.absolute_humidity = calculated?.absolute_humidity ?? calculateAbsoluteHumidity(raw.temperature, raw.humidity);
    }

    if (raw.light_veml7700 !== undefined) {
      sensorData.par = calculated?.par ?? calculatePAR(raw.light_veml7700);
    }

    if (raw.soil_capacitance !== undefined) {
      sensorData.soil_moisture_percentage = calculated?.soil_moisture_percentage ?? calculateSoilMoisture(raw.soil_capacitance);
    }

    if (raw.battery_voltage !== undefined && raw.battery_percentage !== undefined) {
      sensorData.battery_health = calculated?.battery_health ?? calculateBatteryHealth(raw.battery_voltage, raw.battery_percentage);
    }

    // Detect shock from acceleration data
    if (raw.acceleration_x !== undefined && raw.acceleration_y !== undefined && raw.acceleration_z !== undefined) {
      const totalAccel = Math.sqrt(raw.acceleration_x ** 2 + raw.acceleration_y ** 2 + raw.acceleration_z ** 2);
      sensorData.shock_detected = calculated?.shock_detected ?? (totalAccel > 2.0); // Threshold for shock detection
    }

    // Add other calculated fields if provided
    if (calculated?.wet_bulb_temp !== undefined) sensorData.wet_bulb_temp = calculated.wet_bulb_temp;
    if (calculated?.altitude !== undefined) sensorData.altitude = calculated.altitude;
    if (calculated?.weather_trend !== undefined) sensorData.weather_trend = calculated.weather_trend;

    const { error: insertErr } = await supabaseAdmin.from('sensor_readings').insert(sensorData);

    if (insertErr) {
      console.error('Insert error:', insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ message: 'Sensor data stored successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    console.error('Ingest error:', e);
    return new Response(JSON.stringify({ error: 'Invalid token or processing error' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export default handler;