import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  reading_type: string | null;
  device_id: string | null;
  reading_value: number | null;
  threshold_type: 'min' | 'max' | 'normal' | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  reading_type?: string;
  device_id?: string;
  reading_value?: number;
  threshold_type?: 'min' | 'max' | 'normal';
}

// Hook to get notifications for the current user
export const useNotifications = (limit?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('notifications')
        .select(`
          *,
          devices:device_id (
            name,
            device_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (Notification & { devices?: { name: string; device_id: string } })[];
    },
    enabled: !!user,
  });
};

// Hook to get unread notification count
export const useUnreadNotificationCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-notification-count', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_unread_notification_count');

      if (error) throw error;
      return data as number;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Hook to mark notification as read
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read.',
        variant: 'destructive',
      });
    },
  });
};

// Hook to mark all notifications as read
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
      toast({
        title: 'All notifications marked as read',
        description: 'Your notifications have been updated.',
      });
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read.',
        variant: 'destructive',
      });
    },
  });
};

// Hook to create a new notification (for testing or system notifications)
export const useCreateNotification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: input.title,
          message: input.message,
          reading_type: input.reading_type,
          device_id: input.device_id,
          reading_value: input.reading_value,
          threshold_type: input.threshold_type,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
    onError: (error) => {
      console.error('Error creating notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to create notification.',
        variant: 'destructive',
      });
    },
  });
};

// Hook to delete notification
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification.',
        variant: 'destructive',
      });
    },
  });
};

// Utility function to format notification time
export const formatNotificationTime = (timestamp: string): string => {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return notificationTime.toLocaleDateString();
};

// Utility function to get notification icon based on type
export const getNotificationIcon = (readingType: string | null, thresholdType: string | null) => {
  if (!readingType) return '🔔';
  
  switch (readingType) {
    case 'temperature':
      return thresholdType === 'max' ? '🌡️' : '❄️';
    case 'humidity':
      return '💧';
    case 'pressure':
      return '🌪️';
    case 'co2':
      return '💨';
    case 'light_veml7700':
    case 'light_tsl2591':
      return '💡';
    case 'soil_moisture_percentage':
      return '🌱';
    case 'battery_percentage':
    case 'battery_voltage':
      return '🔋';
    case 'shock_detected':
      return '⚠️';
    default:
      return '📊';
  }
};
