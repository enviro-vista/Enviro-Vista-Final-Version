
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Cloud, 
  Settings,
  BarChart3,
  Grid3X3,
  Wifi,
  WifiOff,
  LogOut
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import DeviceCard from "@/components/DeviceCard";
import ChartView from "@/components/ChartView";
import AddDeviceDialog from "@/components/AddDeviceDialog";
import Header from "@/components/Header";
import { useDevices } from "@/hooks/useDevices";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [activeView, setActiveView] = useState<'grid' | 'chart'>('grid');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const { data: devices = [], isLoading } = useDevices();
  const { signOut } = useAuth();
  const [liveMonitoring, setLiveMonitoring] = useState<boolean>(() => JSON.parse(localStorage.getItem("settings.liveMonitoring") ?? "true"));
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => JSON.parse(localStorage.getItem("settings.alertsEnabled") ?? "true"));

  // Calculate average metrics from all devices
  const averageMetrics = devices.length > 0 ? {
    temperature: devices
      .filter(device => device.latest_reading)
      .reduce((sum, device) => sum + (device.latest_reading?.temperature || 0), 0) / 
      devices.filter(device => device.latest_reading).length,
    humidity: devices
      .filter(device => device.latest_reading)
      .reduce((sum, device) => sum + (device.latest_reading?.humidity || 0), 0) / 
      devices.filter(device => device.latest_reading).length,
    pressure: devices
      .filter(device => device.latest_reading)
      .reduce((sum, device) => sum + (device.latest_reading?.pressure || 0), 0) / 
      devices.filter(device => device.latest_reading).length,
    dewPoint: devices
      .filter(device => device.latest_reading)
      .reduce((sum, device) => sum + (device.latest_reading?.dew_point || 0), 0) / 
      devices.filter(device => device.latest_reading).length,
  } : {
    temperature: 0,
    humidity: 0,
    pressure: 0,
    dewPoint: 0,
  };

  const onlineDevices = devices.filter(device => {
    if (!device.latest_reading) return false;
    const lastReading = new Date(device.latest_reading.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastReading.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 2; // Consider online if last reading was within 2 hours
  }).length;

  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dashboard-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Temperature"
            value={averageMetrics.temperature.toFixed(1)}
            unit="°C"
            icon={Thermometer}
            gradient="temp-gradient"
            trend={devices.length > 0 ? "+0.5°C" : "No data"}
          />
          <MetricCard
            title="Humidity"
            value={averageMetrics.humidity.toFixed(1)}
            unit="%"
            icon={Droplets}
            gradient="humidity-gradient"
            trend={devices.length > 0 ? "-2.1%" : "No data"}
          />
          <MetricCard
            title="Pressure"
            value={averageMetrics.pressure.toFixed(0)}
            unit="hPa"
            icon={Gauge}
            gradient="pressure-gradient"
            trend={devices.length > 0 ? "+1.2 hPa" : "No data"}
          />
          <MetricCard
            title="Dew Point"
            value={averageMetrics.dewPoint.toFixed(1)}
            unit="°C"
            icon={Cloud}
            gradient="dewpoint-gradient"
            trend={devices.length > 0 ? "+0.3°C" : "No data"}
          />
        </div>

        {/* Status Summary */}
        <Card className="glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">{onlineDevices} Online</span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{devices.length - onlineDevices} Offline</span>
              </div>
            </div>
            <div className="flex gap-2">
              <AddDeviceDialog />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Configure your dashboard preferences.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Live monitoring</p>
                        <p className="text-xs text-muted-foreground">Update dashboard in real time.</p>
                      </div>
                      <Switch checked={liveMonitoring} onCheckedChange={setLiveMonitoring} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Notifications</p>
                        <p className="text-xs text-muted-foreground">Enable alert popovers.</p>
                      </div>
                      <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        try {
                          localStorage.setItem("settings.liveMonitoring", JSON.stringify(liveMonitoring));
                          localStorage.setItem("settings.alertsEnabled", JSON.stringify(alertsEnabled));
                          toast({ title: "Settings saved" });
                        } catch (e) {
                          toast({ title: "Could not save settings" });
                        }
                      }}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Your Devices</h2>
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'grid' | 'chart')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Charts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        {activeView === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.length > 0 ? (
              devices.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-4">No devices found. Add your first device to get started!</p>
                <AddDeviceDialog />
              </div>
            )}
          </div>
        ) : (
          <ChartView devices={devices} selectedDevice={selectedDevice} />
        )}
      </main>
    </div>
  );
};

export default Index;
