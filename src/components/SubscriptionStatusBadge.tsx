import { Badge } from "@/components/ui/badge";
import { Crown, Zap } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

const SubscriptionStatusBadge = () => {
  const { isPremium, subscriptionTier } = useSubscriptionStatus();

  if (isPremium) {
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
        <Crown className="w-3 h-3 mr-1" />
        Premium
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-muted-foreground">
      <Zap className="w-3 h-3 mr-1" />
      Free Tier
    </Badge>
  );
};

export default SubscriptionStatusBadge;