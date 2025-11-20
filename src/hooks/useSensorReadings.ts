import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SensorReading {
  id: string;
  device_id: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  co2?: number;
  light_veml7700?: number;
  light_tsl2591?: number;
  acceleration_x?: number;
  acceleration_y?: number;
  acceleration_z?: number;
  soil_capacitance?: number;
  battery_voltage?: number;
  battery_percentage?: number;
  dew_point?: number;
  wet_bulb_temp?: number;
  heat_index?: number;
  vpd?: number;
  absolute_humidity?: number;
  altitude?: number;
  weather_trend?: string;
  par?: number;
  soil_moisture_percentage?: number;
  soil_temperature?: number;
  battery_health?: number;
  shock_detected?: boolean;
  created_at: string;
}

export const useSensorReadings = (deviceId?: string, timeRange: string = '24h') => {
  return useQuery({
    queryKey: ['sensor-readings', deviceId, timeRange],
    queryFn: async () => {
      // Get the current user's session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (deviceId && deviceId !== 'all') {
        params.append('device_id', deviceId);
      }
      params.append('time_range', timeRange);
      params.append('limit', '1000'); // Increase limit for better data

      // Call the fetch-readings function with GET request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-readings?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch readings');
      }

      const result = await response.json();
      return result.data as SensorReading[];
    },
    enabled: !!deviceId || deviceId === 'all',
  });
};