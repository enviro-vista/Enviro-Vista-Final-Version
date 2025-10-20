import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface NotificationSetting {
  id: string;
  user_id: string;
  reading_type: string;
  is_enabled: boolean;
  min_threshold: number | null;
  max_threshold: number | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettingInput {
  reading_type: string;
  is_enabled: boolean;
  min_threshold?: number | null;
  max_threshold?: number | null;
}

// Define all available reading types
export const READING_TYPES = {
  // Basic readings (available for free users)
  temperature: { label: 'Temperature', unit: '°C', isPremium: false },
  humidity: { label: 'Humidity', unit: '%', isPremium: false },
  pressure: { label: 'Pressure', unit: 'hPa', isPremium: false },
  dew_point: { label: 'Dew Point', unit: '°C', isPremium: false },
  co2: { label: 'CO₂', unit: 'ppm', isPremium: false },
  
  // Premium readings
  light_veml7700: { label: 'Light (VEML7700)', unit: 'lux', isPremium: true },
  light_tsl2591: { label: 'Light (TSL2591)', unit: 'lux', isPremium: true },
  acceleration_x: { label: 'Acceleration X', unit: 'm/s²', isPremium: true },
  acceleration_y: { label: 'Acceleration Y', unit: 'm/s²', isPremium: true },
  acceleration_z: { label: 'Acceleration Z', unit: 'm/s²', isPremium: true },
  soil_capacitance: { label: 'Soil Capacitance', unit: '', isPremium: true },
  battery_voltage: { label: 'Battery Voltage', unit: 'V', isPremium: true },
  battery_percentage: { label: 'Battery Level', unit: '%', isPremium: true },
  wet_bulb_temp: { label: 'Wet Bulb Temperature', unit: '°C', isPremium: true },
  heat_index: { label: 'Heat Index', unit: '°C', isPremium: true },
  vpd: { label: 'VPD', unit: 'kPa', isPremium: true },
  absolute_humidity: { label: 'Absolute Humidity', unit: 'g/m³', isPremium: true },
  altitude: { label: 'Altitude', unit: 'm', isPremium: true },
  weather_trend: { label: 'Weather Trend', unit: '', isPremium: true },
  par: { label: 'PAR', unit: 'μmol/m²/s', isPremium: true },
  soil_moisture_percentage: { label: 'Soil Moisture', unit: '%', isPremium: true },
  battery_health: { label: 'Battery Health', unit: '%', isPremium: true },
  shock_detected: { label: 'Shock Detection', unit: '', isPremium: true },
  uv_index: { label: 'UV Index', unit: '', isPremium: true },
} as const;

export type ReadingType = keyof typeof READING_TYPES;

// Hook to get notification settings for the current user
export const useNotificationSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as NotificationSetting[];
    },
    enabled: !!user,
  });
};

// Hook to upsert notification setting
export const useUpsertNotificationSetting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NotificationSettingInput) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          reading_type: input.reading_type,
          is_enabled: input.is_enabled,
          min_threshold: input.min_threshold,
          max_threshold: input.max_threshold,
        }, {
          onConflict: 'user_id,reading_type'
        })
        .select()
        .single();

      if (error) throw error;
      return data as NotificationSetting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({
        title: 'Notification setting updated',
        description: 'Your notification preferences have been saved.',
      });
    },
    onError: (error) => {
      console.error('Error updating notification setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification setting. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Hook to delete notification setting
export const useDeleteNotificationSetting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (readingType: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notification_settings')
        .delete()
        .eq('user_id', user.id)
        .eq('reading_type', readingType);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({
        title: 'Notification setting removed',
        description: 'Your notification preference has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting notification setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove notification setting. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Utility function to get notification setting for a specific reading type
export const useNotificationSetting = (readingType: ReadingType) => {
  const { data: settings = [] } = useNotificationSettings();
  
  return settings.find(setting => setting.reading_type === readingType) || {
    reading_type: readingType,
    is_enabled: false,
    min_threshold: null,
    max_threshold: null,
  };
};
