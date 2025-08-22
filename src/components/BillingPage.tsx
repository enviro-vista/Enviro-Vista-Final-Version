import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, CreditCard, Calendar, DollarSign, User, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscriptionStatus, useCheckSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const BillingPage = () => {
  const { isPremium, subscriptionTier } = useSubscriptionStatus();
  const { session } = useAuth();
  const { toast } = useToast();
  const checkSubscription = useCheckSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Customer portal error:', error);
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = () => {
    checkSubscription.mutate();
    toast({
      title: "Refreshing...",
      description: "Checking your latest subscription status.",
    });
  };

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Billing & Subscription</h1>
            <p className="text-xl text-muted-foreground">
              Manage your subscription and billing information
            </p>
          </div>

          {/* Current Plan */}
          <Card className={`${isPremium ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5' : 'border-muted-foreground/20'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPremium ? 'bg-gradient-to-br from-primary to-primary/60' : 'bg-muted'}`}>
                    {isPremium ? (
                      <Crown className="w-6 h-6 text-white" />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {isPremium ? 'Premium Plan' : 'Free Plan'}
                    </CardTitle>
                    <p className="text-muted-foreground">
                      {isPremium 
                        ? 'Access to all premium features and sensors' 
                        : 'Basic environmental monitoring'
                      }
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={isPremium ? "default" : "secondary"}
                  className={isPremium ? "bg-gradient-to-r from-primary to-primary/80" : ""}
                >
                  {isPremium ? (
                    <>
                      <Crown className="w-3 h-3 mr-1" />
                      Active
                    </>
                  ) : (
                    "Free Tier"
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Price</p>
                    <p className="text-lg font-bold">
                      {isPremium ? '$9.99/month' : '$0'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Billing</p>
                    <p className="text-lg font-bold">
                      {isPremium ? 'Monthly' : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-lg font-bold">
                      {isPremium ? 'Active' : 'Free'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button 
                  onClick={handleRefreshStatus}
                  variant="outline"
                  disabled={checkSubscription.isPending}
                >
                  {checkSubscription.isPending ? "Refreshing..." : "Refresh Status"}
                </Button>
                
                {isPremium ? (
                  <Button 
                    onClick={handleManageSubscription}
                    disabled={isLoading}
                  >
                    {isLoading ? "Opening..." : "Manage Subscription"}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/subscription">
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Features Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  Free Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Device ID registry",
                  "Temperature monitoring", 
                  "Humidity tracking",
                  "Pressure readings",
                  "Dew point calculations",
                  "Basic CO₂ measurements"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Premium Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "VPD (Vapor Pressure Deficit)",
                  "PAR (Photosynthetically Active Radiation)",
                  "UV-index monitoring",
                  "Weather Trend analysis", 
                  "Light sensor data",
                  "Soil moisture monitoring",
                  "Battery health analytics",
                  "Priority support"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about your subscription or billing, we're here to help.
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong> support@environmentalmonitor.com
                </p>
                <p className="text-sm">
                  <strong>Response time:</strong> {isPremium ? '24 hours (Priority)' : '48-72 hours'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;