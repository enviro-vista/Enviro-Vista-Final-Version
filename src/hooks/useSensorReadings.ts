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
  battery_health?: number;
  shock_detected?: boolean;
  created_at: string;
}

export const useSensorReadings = (deviceId?: string, timeRange: string = '24h') => {
  return useQuery({
    queryKey: ['sensor-readings', deviceId, timeRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-readings', {
        body: {},
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;
      return data.data as SensorReading[];
    },
    enabled: !!deviceId || deviceId === 'all',
  });
};