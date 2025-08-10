
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
import { Device } from "@/hooks/useDevices";

interface DeviceCardProps {
  device: Device;
}

const DeviceCard = ({ device }: DeviceCardProps) => {
  const isOnline = device.latest_reading ? (() => {
    const lastReading = new Date(device.latest_reading.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastReading.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 2; // Consider online if last reading was within 2 hours
  })() : false;

  const lastReading = device.latest_reading ? new Date(device.latest_reading.timestamp) : null;

  return (
    <Card className="glass-card p-6 group hover:shadow-lg transition-all duration-300 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h3 className="font-semibold tracking-tight">{device.name}</h3>
          <p className="text-sm text-muted-foreground">{device.device_id}</p>
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

      {device.latest_reading ? (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded temp-gradient text-white">
              <Thermometer className="h-3 w-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Temp</p>
              <p className="font-semibold">{device.latest_reading.temperature.toFixed(1)}°C</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded humidity-gradient text-white">
              <Droplets className="h-3 w-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="font-semibold">{device.latest_reading.humidity.toFixed(1)}%</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded pressure-gradient text-white">
              <Gauge className="h-3 w-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pressure</p>
              <p className="font-semibold">{device.latest_reading.pressure.toFixed(0)} hPa</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded dewpoint-gradient text-white">
              <Cloud className="h-3 w-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dew Point</p>
              <p className="font-semibold">{device.latest_reading.dew_point.toFixed(1)}°C</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-center py-8">
          <p className="text-muted-foreground text-sm">No readings available</p>
        </div>
      )}

      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          {lastReading ? (
            <>Last reading: {formatDistanceToNow(lastReading, { addSuffix: true })}</>
          ) : (
            "No readings yet"
          )}
        </p>
      </div>
    </Card>
  );
};

export default DeviceCard;
