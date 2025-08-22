# Stripe Integration Documentation

## Overview
This project integrates Stripe for subscription management using Supabase Edge Functions. The integration supports premium subscription tiers with automatic billing.

## Stripe Key Configuration

### Required Keys
- **Secret Key**: Used in edge functions for payment processing
  - Format: `sk_test_...` (test) or `sk_live_...` (production)
  - Stored as: `STRIPE_SECRET_KEY` in Supabase secrets
  - Required for: Creating checkout sessions, managing subscriptions

### Key Setup
1. Get your Stripe secret key from [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys)
2. Add it to Supabase secrets using the project interface
3. The key is automatically available to all edge functions

## Edge Functions

### `subscribe` Function
- **Purpose**: Creates Stripe checkout sessions for premium subscriptions
- **Location**: `supabase/functions/subscribe/index.ts`
- **Authentication**: Required (JWT verified)
- **Key Usage**: Uses `STRIPE_SECRET_KEY` to create checkout sessions

### `check-subscription` Function
- **Purpose**: Verifies user subscription status with Stripe
- **Location**: `supabase/functions/check-subscription/index.ts`
- **Authentication**: Required (JWT verified)
- **Key Usage**: Uses `STRIPE_SECRET_KEY` to query subscription data

## Frontend Integration

### Subscription Components
- `SubscriptionUpgrade.tsx` - Upgrade interface
- `SubscriptionStatusBadge.tsx` - Status display
- `UpgradePrompt.tsx` - Upgrade prompts

### Subscription Hooks
- `useSubscription.ts` - Manages subscription state
- `useUpgradeSubscription()` - Handles upgrade flow
- `useSubscriptionStatus()` - Gets current status

## Database Schema

### Profiles Table
```sql
profiles {
  id: UUID (references auth.users)
  subscription_tier: "free" | "premium"
  -- other fields
}
```

### Security Functions
- `is_premium()` - Checks if user has premium access
- `is_admin()` - Checks admin privileges

## Testing

### Test Mode
- Use test Stripe keys (`sk_test_...`)
- Test cards: 4242424242424242 (Visa)
- No real charges occur in test mode

### Production
- Use live Stripe keys (`sk_live_...`)
- Real payments will be processed
- Ensure proper webhook setup for production

## Key Security
- Secret keys are stored securely in Supabase secrets
- Never expose secret keys in client-side code
- Keys are automatically injected into edge function environment
- Use environment variables in edge functions: `Deno.env.get("STRIPE_SECRET_KEY")`

## Current Configuration
- Project uses subscription-based billing
- Premium tier: Enhanced features and unlimited access
- Free tier: Basic functionality with limitations
- Automatic subscription status synchronization