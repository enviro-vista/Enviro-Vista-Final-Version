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
  WifiOff,
  Trash,
  Pencil,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Device } from "@/hooks/useDevices";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDeleteDevice } from "@/hooks/useDevices";
import EditDeviceDialog from "./EditDeviceDialog";

interface DeviceCardProps {
  device: Device;
  onDeviceUpdated: () => void;
}

const DeviceCard = ({ device, onDeviceUpdated }: DeviceCardProps) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const deleteDevice = useDeleteDevice();
  
  const isOnline = device.latest_reading ? (() => {
    const lastReading = new Date(device.latest_reading.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastReading.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 2; // Consider online if last reading was within 2 hours
  })() : false;

  const lastReading = device.latest_reading ? new Date(device.latest_reading.timestamp) : null;

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${device.name}"? This action cannot be undone.`)) {
      try {
        await deleteDevice.mutateAsync(device.id);
        toast({
          title: "Device Deleted",
          description: `"${device.name}" has been removed from your devices.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete device. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call to refresh device data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: `Device data for "${device.name}" has been refreshed.`,
    });
  };

  return (
    <>
      <Card className="glass-card p-6 group hover:shadow-lg transition-all duration-300 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="font-semibold tracking-tight">{device.name}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{device.device_id}</p>
              <Badge variant="secondary" className="text-xs">
                {device.device_type === 'AIR' ? '🌬️ Air' : '🌱 Soil'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={isOnline ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="focus:outline-none">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename Device
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-500 focus:bg-red-500/10 focus:text-red-500"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Device
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* Rename Device Dialog */}
      <EditDeviceDialog 
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        device={device}
        onDeviceUpdated={onDeviceUpdated}
      />
    </>
  );
};

export default DeviceCard;
