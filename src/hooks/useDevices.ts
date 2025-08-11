
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Device {
  id: string;
  device_id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  latest_reading?: {
    temperature: number;
    humidity: number;
    pressure: number;
    dew_point: number;
    timestamp: string;
  };
}

export const useDevices = () => {
  return useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          readings!readings_device_id_fkey (
            temperature,
            humidity,
            pressure,
            dew_point,
            timestamp
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add latest reading to each device
      return data.map(device => ({
        ...device,
        latest_reading: device.readings?.[0] || null
      }));
    },
  });
};

export const useAddDevice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ device_id, name }: { device_id: string; name: string }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError || new Error('Not authenticated');
      const { data: response, error } = await supabase
        .functions
        .invoke('register-device', {
          body: { device_id, name },
        });

      if (error) throw error;
      return response;

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast({
        title: "Success",
        description: "Device added successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add device",
        variant: "destructive",
      });
    },
  });
};
