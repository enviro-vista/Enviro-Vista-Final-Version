
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Reading {
  id: string;
  device_id: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  dew_point: number;
  created_at: string;
}

export const useReadings = (deviceId?: string, timeRange: string = '24h') => {
  return useQuery({
    queryKey: ['readings', deviceId, timeRange],
    queryFn: async () => {
      let query = supabase
        .from('readings')
        .select('*')
        .order('timestamp', { ascending: true });

      // Filter by device if specified
      if (deviceId && deviceId !== 'all') {
        query = query.eq('device_id', deviceId);
      }

      // Filter by time range
      const now = new Date();
      let startTime = new Date();
      
      switch (timeRange) {
        case '24h':
          startTime.setHours(now.getHours() - 24);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
      }

      query = query.gte('timestamp', startTime.toISOString());

      const { data, error } = await query;

      if (error) throw error;
      return data as Reading[];
    },
  });
};
