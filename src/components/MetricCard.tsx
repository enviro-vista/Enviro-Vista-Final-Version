
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  gradient: string;
  trend?: string;
}

const MetricCard = ({ title, value, unit, icon: Icon, gradient, trend }: MetricCardProps) => {
  return (
    <Card className="metric-card group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${gradient} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <Badge variant="secondary" className="text-xs">
            {trend}
          </Badge>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          <span className="text-sm text-muted-foreground font-medium">{unit}</span>
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;
