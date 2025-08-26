-- Create stripe_transactions table for storing payment information
CREATE TABLE IF NOT EXISTS public.stripe_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  customer_email TEXT NOT NULL,
  customer_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed', 'canceled'
  subscription_id TEXT,
  billing_cycle TEXT, -- 'monthly', 'yearly'
  next_billing_date TIMESTAMP WITH TIME ZONE,
  product_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_customer_email ON public.stripe_transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_status ON public.stripe_transactions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_created_at ON public.stripe_transactions(created_at);

-- Enable Row Level Security
ALTER TABLE public.stripe_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for stripe_transactions (drop existing ones first)
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.stripe_transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.stripe_transactions;
DROP POLICY IF EXISTS "Service role can update transactions" ON public.stripe_transactions;

CREATE POLICY "Admins can view all transactions"
  ON public.stripe_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can insert transactions"
  ON public.stripe_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update transactions"
  ON public.stripe_transactions FOR UPDATE
  USING (true);

-- Create function to calculate total income
CREATE OR REPLACE FUNCTION public.calculate_total_income()
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) 
     FROM public.stripe_transactions 
     WHERE status = 'succeeded'), 
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create function to get monthly income
CREATE OR REPLACE FUNCTION public.calculate_monthly_income(month_year DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) 
     FROM public.stripe_transactions 
     WHERE status = 'succeeded' 
     AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', month_year)), 
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
