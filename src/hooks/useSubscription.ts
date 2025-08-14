import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  subscription_tier: 'free' | 'premium';
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user,
  });
};

export const useSubscriptionStatus = () => {
  const { data: profile } = useUserProfile();
  return {
    isPremium: profile?.subscription_tier === 'premium',
    isFree: profile?.subscription_tier === 'free' || !profile?.subscription_tier,
    subscriptionTier: profile?.subscription_tier || 'free',
  };
};

export const useCheckSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to check subscription status",
        variant: "destructive",
      });
    },
  });
};

export const useUpgradeSubscription = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('subscribe', {
        body: { tier: 'premium' },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        // Open Stripe checkout in a new tab
        window.open(data.checkout_url, '_blank');
      }
      
      toast({
        title: "Upgrade Initiated",
        description: "Redirecting to checkout...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });
};