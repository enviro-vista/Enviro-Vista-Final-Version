import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Lock } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import UpgradePrompt from "./UpgradePrompt";
import { getFieldLabel, getFieldUnit, isPremiumField } from "@/utils/dataAccess";

interface PremiumDataDisplayProps {
  field: string;
  value: number | string | null;
  title?: string;
  icon?: React.ElementType;
  className?: string;
}

const PremiumDataDisplay = ({ field, value, title, icon: Icon, className }: PremiumDataDisplayProps) => {
  const { isPremium } = useSubscriptionStatus();
  const isFieldPremium = isPremiumField(field);
  
  // If it's not a premium field, display normally
  if (!isFieldPremium) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {title || getFieldLabel(field as any)}
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {value !== null ? `${value}${getFieldUnit(field as any)}` : "No data"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If user has premium access, show the data
  if (isPremium) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {title || getFieldLabel(field as any)}
            <Badge variant="secondary" className="text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {value !== null ? `${value}${getFieldUnit(field as any)}` : "No data"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // For free users accessing premium fields, show upgrade prompt
  return (
    <Card className={`${className} border-muted-foreground/20 bg-muted/10`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title || getFieldLabel(field as any)}
          <Badge variant="outline" className="text-xs">
            <Lock className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold text-muted-foreground">
          ---
        </div>
        <UpgradePrompt 
          title="Premium Feature"
          description={`Unlock ${getFieldLabel(field as any)} monitoring`}
          compact={true}
          onDismiss={() => {}}
        />
      </CardContent>
    </Card>
  );
};

export default PremiumDataDisplay;