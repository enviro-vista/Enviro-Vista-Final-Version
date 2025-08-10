
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Cloud, 
  MoreVertical,
  Wifi,
  WifiOff
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Device {
  id: string;
  name: string;
  deviceId: string;
  lastReading: Date;
  isOnline: boolean;
  temperature: number;
  humidity: number;
  pressure: number;
  dewPoint: number;
}

interface DeviceCardProps {
  device: Device;
}

const DeviceCard = ({ device }: DeviceCardProps) => {
  const {
    name,
    deviceId,
    lastReading,
    isOnline,
    temperature,
    humidity,
    pressure,
    dewPoint
  } = device;

  return (
    <Card className="glass-card p-6 group hover:shadow-lg transition-all duration-300 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h3 className="font-semibold tracking-tight">{name}</h3>
          <p className="text-sm text-muted-foreground">{deviceId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={isOnline ? "status-online" : "status-offline"}>
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded temp-gradient text-white">
            <Thermometer className="h-3 w-3" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Temp</p>
            <p className="font-semibold">{temperature}°C</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded humidity-gradient text-white">
            <Droplets className="h-3 w-3" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Humidity</p>
            <p className="font-semibold">{humidity}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded pressure-gradient text-white">
            <Gauge className="h-3 w-3" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pressure</p>
            <p className="font-semibold">{pressure} hPa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded dewpoint-gradient text-white">
            <Cloud className="h-3 w-3" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dew Point</p>
            <p className="font-semibold">{dewPoint}°C</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Last reading: {formatDistanceToNow(lastReading, { addSuffix: true })}
        </p>
      </div>
    </Card>
  );
};

export default DeviceCard;
