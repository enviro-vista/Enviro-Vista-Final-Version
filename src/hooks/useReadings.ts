
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Reading {
  id: string;
  device_id: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  dew_point?: number;
  co2?: number;
  light_veml7700?: number;
  light_tsl2591?: number;
  acceleration_x?: number;
  acceleration_y?: number;
  acceleration_z?: number;
  soil_capacitance?: number;
  battery_voltage?: number;
  battery_percentage?: number;
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

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export const useReadings = (
  deviceId?: string, 
  timeRange: string = '24h',
  customDateRange?: DateRange
) => {
  return useQuery({
    queryKey: ['readings', deviceId, timeRange, customDateRange],
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
      params.append('limit', '1000');

      // Add custom date range if provided
      if (customDateRange?.from && customDateRange?.to) {
        params.append('start_date', customDateRange.from.toISOString());
        params.append('end_date', customDateRange.to.toISOString());
      }

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
      return result.data as Reading[];
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: 2, // Retry failed requests twice
    retryDelay: 1000, // Wait 1 second between retries
  });
};
