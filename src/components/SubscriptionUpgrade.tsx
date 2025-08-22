import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpgradeSubscription } from "@/hooks/useSubscription";
import { Check, Zap, Crown } from "lucide-react";

const SubscriptionUpgrade = () => {
  const upgradeSubscription = useUpgradeSubscription();
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "yearly">("monthly");

  const handleUpgrade = (billing: "monthly" | "yearly") => {
    upgradeSubscription.mutate({ tier: 'premium', billing });
  };

  const freeFeatures = [
    "Device ID registry",
    "Temperature monitoring",
    "Humidity tracking", 
    "Pressure readings",
    "Dew point calculations",
    "Basic CO₂ measurements"
  ];

  const premiumFeatures = [
    "VPD (Vapor Pressure Deficit)",
    "PAR (Photosynthetically Active Radiation)",
    "UV-index monitoring",
    "Weather Trend analysis",
    "Light sensor data (VEML7700 & TSL2591)",
    "Acceleration and shock detection",
    "Soil moisture monitoring",
    "Battery health analytics",
    "Heat index calculations",
    "Priority support"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Current Plan Banner */}
      <Card className="border-muted-foreground/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Free Tier</h3>
                <p className="text-sm text-muted-foreground">Basic environmental monitoring</p>
              </div>
            </div>
            <Badge variant="secondary">Current Plan</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <Card className="border-muted-foreground/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-xl">Free Tier</CardTitle>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground">Perfect for basic monitoring</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {freeFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-green-600" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="border-primary/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-primary/80 text-primary-foreground px-3 py-1 text-xs font-medium">
            Most Popular
          </div>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl">Premium</CardTitle>
            </div>
            
            <Tabs value={selectedBilling} onValueChange={(value) => setSelectedBilling(value as "monthly" | "yearly")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
              
              <TabsContent value="monthly" className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">Billed monthly</p>
              </TabsContent>
              
              <TabsContent value="yearly" className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$99.99</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-primary font-medium">≈$8.33/month - Save 17%</p>
              </TabsContent>
            </Tabs>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Everything in Free, plus:</p>
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={() => handleUpgrade(selectedBilling)} 
              className="w-full" 
              disabled={upgradeSubscription.isPending}
            >
              {upgradeSubscription.isPending ? "Processing..." : 
                selectedBilling === "yearly" ? "Upgrade to Premium (Annual)" : "Upgrade to Premium (Monthly)"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Secure payment powered by Stripe
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionUpgrade;