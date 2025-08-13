import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Check, Zap } from "lucide-react";

const SubscriptionUpgrade = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('subscribe', {
        body: { tier: 'premium' },
      });

      if (error) throw error;

      toast({
        title: "Upgrade Initiated",
        description: "Redirecting to checkout... (This is a placeholder implementation)",
      });

      // In a real implementation, redirect to Stripe checkout
      console.log('Checkout URL (placeholder):', data.checkout_url);
      
      // For demo purposes, we'll just show success
      setTimeout(() => {
        toast({
          title: "Upgrade Complete",
          description: "You now have access to premium features!",
        });
        window.location.reload(); // Refresh to update subscription status
      }, 2000);

    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Upgrade Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Access to CO₂ readings",
    "Advanced calculated metrics",
    "Light sensor data (VEML7700 & TSL2591)",
    "Acceleration and shock detection",
    "Soil moisture monitoring",
    "Battery health analytics",
    "VPD and dew point calculations",
    "Heat index and weather trends",
    "Priority support",
  ];

  return (
    <Card className="max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold">$9.99</span>
          <span className="text-muted-foreground">/month</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Badge variant="secondary" className="w-full justify-center mb-4">
            Currently Free Tier
          </Badge>
          <Button 
            onClick={handleUpgrade} 
            className="w-full" 
            disabled={loading}
          >
            {loading ? "Processing..." : "Upgrade Now"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Secure payment powered by Stripe (placeholder)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionUpgrade;