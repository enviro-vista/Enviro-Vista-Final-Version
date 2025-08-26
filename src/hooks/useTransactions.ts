import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StripeTransaction {
  id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  customer_email: string;
  customer_id: string | null;
  amount: number; // Amount in cents
  currency: string;
  status: string;
  subscription_id: string | null;
  billing_cycle: string;
  next_billing_date: string | null;
  product_name: string;
  created_at: string;
  updated_at: string;
}

export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useTotalIncome = () => {
  return useQuery({
    queryKey: ['total-income'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('calculate_total_income');
        if (error) {
          // Fallback to manual calculation if function doesn't exist
          const { data: transactions } = await supabase
            .from('stripe_transactions')
            .select('amount')
            .eq('status', 'paid');
          
          return transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
        }
        return data || 0;
      } catch (error) {
        // Fallback to manual calculation
        const { data: transactions } = await supabase
          .from('stripe_transactions')
          .select('amount')
          .eq('status', 'succeeded');
        
        return transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      }
    },
  });
};

export const useMonthlyIncome = (monthYear: Date = new Date()) => {
  return useQuery({
    queryKey: ['monthly-income', monthYear.toISOString().slice(0, 7)],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('calculate_monthly_income', {
          month_year: monthYear.toISOString().slice(0, 10)
        });
        if (error) {
          // Fallback to manual calculation if function doesn't exist
          const startOfMonth = new Date(monthYear.getFullYear(), monthYear.getMonth(), 1);
          const endOfMonth = new Date(monthYear.getFullYear(), monthYear.getMonth() + 1, 0);
          
          const { data: transactions } = await supabase
            .from('stripe_transactions')
            .select('amount')
            .eq('status', 'paid')
            .gte('created_at', startOfMonth.toISOString())
            .lte('created_at', endOfMonth.toISOString());
          
          return transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
        }
        return data || 0;
      } catch (error) {
        // Fallback to manual calculation
        const startOfMonth = new Date(monthYear.getFullYear(), monthYear.getMonth(), 1);
        const endOfMonth = new Date(monthYear.getFullYear(), monthYear.getMonth() + 1, 0);
        
        const { data: transactions } = await supabase
          .from('stripe_transactions')
          .select('amount')
          .eq('status', 'succeeded')
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());
        
        return transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      }
    },
  });
};
