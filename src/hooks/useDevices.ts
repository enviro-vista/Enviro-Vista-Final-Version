import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SignJWT } from 'jose';

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
      // Get current user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw authError || new Error('User not authenticated');
      }

      // Insert device directly into database
      const { data: device, error: insertError } = await supabase
        .from('devices')
        .insert([{ device_id, name, owner_id: user.id }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Generate JWT token client-side
      const secret = new TextEncoder().encode(
        process.env.NEXT_PUBLIC_DEVICE_JWT_SECRET || 't3fYXmyny2Hvf+ZBd4jUp3ixZRySEnNtx7iArRZuCdqtmtBR7KvNLn/4G957qBHDnK1uovHokQITGQF8behvVA=='
      );
      
      const payload = { 
        device_id: device.device_id, 
        owner_id: user.id,
        exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
      };
      
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret);

      return { token, device };
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