import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SignJWT } from 'jose';

export interface Device {
  id: string;
  device_id: string;
  name: string;
  device_type: 'AIR' | 'SOIL';
  crop_type?: string | null;
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
        .order('created_at', { ascending: false })
        .limit(2); // Limit to 2 devices for dashboard

      if (error) throw error;

      return data.map(device => ({
        ...device,
        latest_reading: device.readings?.[0] || null
      }));
    },
  });
};

// Hook for getting all devices (for devices page)
export const useAllDevices = () => {
  return useQuery({
    queryKey: ['all-devices'],
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

// Add to the existing file
export const useUpdateDevice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, device_type, crop_type }: { id: string; name: string; device_type: 'AIR' | 'SOIL'; crop_type?: string | null }) => {
      const updateData: any = { name, device_type };
      if (crop_type !== undefined) {
        updateData.crop_type = crop_type;
      }
      
      const { data, error } = await supabase
        .from('devices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedDevice) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast({
        title: "Success",
        description: "Device name updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update device",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteDevice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
      return deviceId;
    },
    onSuccess: (deletedDeviceId) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast({
        title: "Success",
        description: "Device deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete device",
        variant: "destructive",
      });
    },
  });
};

export const useAddDevice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ device_id, name, device_type, crop_type }: { device_id: string; name: string; device_type: 'AIR' | 'SOIL'; crop_type?: string | null }) => {
      // Get current user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw authError || new Error('User not authenticated');
      }

      // Prepare insert data
      const insertData: any = { device_id, name, device_type, owner_id: user.id };
      if (crop_type) {
        insertData.crop_type = crop_type;
      }

      // Insert device directly into database
      const { data: device, error: insertError } = await supabase
        .from('devices')
        .insert([insertData])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Generate JWT token client-side
      const secret = new TextEncoder().encode(
        import.meta.env.VITE_DEVICE_JWT_SECRET || 't3fYXmyny2Hvf+ZBd4jUp3ixZRySEnNtx7iArRZuCdqtmtBR7KvNLn/4G957qBHDnK1uovHokQITGQF8behvVA=='
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
      // Handle specific database constraint violations
      if (error.code === '23505' && error.message?.includes('devices_device_id_key')) {
        toast({
          title: "Device ID Already Exists",
          description: "A device with this ID is already registered. Please use a different device ID.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to add device",
          variant: "destructive",
        });
      }
    },
  });
};
