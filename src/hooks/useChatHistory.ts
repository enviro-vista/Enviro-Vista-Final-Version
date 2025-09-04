import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sensor_data?: any;
  context?: 'auto_suggestion' | 'user_question';
  tokens_used?: number;
  created_at: string;
  updated_at: string;
}

export interface ChatPreferences {
  auto_suggestions_enabled: boolean;
  last_auto_suggestion?: string;
  suggestion_interval_hours: number;
}

// Hook to fetch chat history
export const useChatHistory = (limit: number = 50) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chat-history', user?.id, limit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Return in chronological order (oldest first)
      return (data as ChatMessage[]).reverse();
    },
    enabled: !!user,
  });
};

// Hook to add a new chat message
export const useAddChatMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (message: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      sensor_data?: any;
      context?: 'auto_suggestion' | 'user_question';
      tokens_used?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          user_id: user.id,
          ...message,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as ChatMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    },
  });
};

// Hook to fetch chat preferences
export const useChatPreferences = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chat-preferences', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Use the function to get or create preferences
      const { data, error } = await supabase.rpc('get_or_create_chat_preferences', {
        p_user_id: user.id
      });

      if (error) throw error;
      
      // The function returns an array, get the first item
      return data[0] as ChatPreferences;
    },
    enabled: !!user,
  });
};

// Hook to update chat preferences
export const useUpdateChatPreferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (preferences: Partial<ChatPreferences>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('chat_preferences')
        .upsert([{
          user_id: user.id,
          ...preferences,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-preferences'] });
    },
  });
};

// Hook to clear chat history
export const useClearChatHistory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    },
  });
};

// Hook to update last auto suggestion time
export const useUpdateLastSuggestionTime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('chat_preferences')
        .upsert([{
          user_id: user.id,
          last_auto_suggestion: new Date().toISOString(),
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-preferences'] });
    },
  });
};

