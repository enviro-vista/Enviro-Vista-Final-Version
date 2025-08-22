import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface UpgradePromptProps {
  title?: string;
  description?: string;
  compact?: boolean;
  onDismiss?: () => void;
}

const UpgradePrompt = ({ 
  title = "Unlock Premium Features", 
  description = "Get access to advanced metrics and premium sensors",
  compact = false,
  onDismiss 
}: UpgradePromptProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Premium required</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            asChild
            className="h-7 px-3 text-xs"
          >
            <Link to="/subscription">
              Upgrade
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-7 w-7 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <Badge variant="outline" className="mt-1 text-xs">
                Premium Feature
              </Badge>
            </div>
          </div>
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            VPD (Vapor Pressure Deficit) monitoring
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            PAR and UV-index sensors
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            Weather trend analysis
          </div>
        </div>
        <Button 
          asChild
          className="w-full"
        >
          <Link to="/subscription">
            Upgrade to Premium
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UpgradePrompt;