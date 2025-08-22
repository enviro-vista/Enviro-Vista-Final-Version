import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import SubscriptionUpgrade from "./SubscriptionUpgrade";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

const SubscriptionPage = () => {
  const { isPremium } = useSubscriptionStatus();

  if (isPremium) {
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

          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mb-4">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-3xl">You're Premium!</CardTitle>
                <p className="text-muted-foreground">
                  Enjoy access to all advanced environmental monitoring features
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-card rounded-lg border">
                    <div className="text-2xl font-bold text-primary">VPD</div>
                    <p className="text-sm text-muted-foreground">Vapor Pressure Deficit</p>
                  </div>
                  <div className="text-center p-4 bg-card rounded-lg border">
                    <div className="text-2xl font-bold text-primary">PAR</div>
                    <p className="text-sm text-muted-foreground">Photosynthetic Radiation</p>
                  </div>
                  <div className="text-center p-4 bg-card rounded-lg border">
                    <div className="text-2xl font-bold text-primary">UV</div>
                    <p className="text-sm text-muted-foreground">UV Index</p>
                  </div>
                  <div className="text-center p-4 bg-card rounded-lg border">
                    <div className="text-2xl font-bold text-primary">Trends</div>
                    <p className="text-sm text-muted-foreground">Weather Analysis</p>
                  </div>
                </div>
                
                <div className="text-center pt-4 border-t">
                  <Badge className="bg-gradient-to-r from-primary to-primary/80">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium Active
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Manage your subscription in your Stripe customer portal
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock advanced environmental monitoring with premium sensors and analytics
          </p>
        </div>

        <SubscriptionUpgrade />
      </div>
    </div>
  );
};

export default SubscriptionPage;