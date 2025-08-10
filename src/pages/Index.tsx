
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Cloud, 
  Plus, 
  Settings,
  BarChart3,
  Grid3X3,
  Wifi,
  WifiOff
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import DeviceCard from "@/components/DeviceCard";
import ChartView from "@/components/ChartView";
import Header from "@/components/Header";

// Mock data for demonstration
const mockDevices = [
  {
    id: "1",
    name: "Living Room Sensor",
    deviceId: "ESP32_LR_001",
    lastReading: new Date(),
    isOnline: true,
    temperature: 23.5,
    humidity: 45.2,
    pressure: 1013.2,
    dewPoint: 11.2
  },
  {
    id: "2", 
    name: "Greenhouse Monitor",
    deviceId: "ESP32_GH_002",
    lastReading: new Date(Date.now() - 3600000), // 1 hour ago
    isOnline: true,
    temperature: 28.1,
    humidity: 72.8,
    pressure: 1012.8,
    dewPoint: 22.9
  },
  {
    id: "3",
    name: "Basement Sensor",
    deviceId: "ESP32_BS_003", 
    lastReading: new Date(Date.now() - 7200000), // 2 hours ago
    isOnline: false,
    temperature: 18.3,
    humidity: 65.1,
    pressure: 1014.1,
    dewPoint: 12.1
  }
];

const Index = () => {
  const [activeView, setActiveView] = useState<'grid' | 'chart'>('grid');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  const averageMetrics = {
    temperature: mockDevices.reduce((sum, device) => sum + device.temperature, 0) / mockDevices.length,
    humidity: mockDevices.reduce((sum, device) => sum + device.humidity, 0) / mockDevices.length,
    pressure: mockDevices.reduce((sum, device) => sum + device.pressure, 0) / mockDevices.length,
    dewPoint: mockDevices.reduce((sum, device) => sum + device.dewPoint, 0) / mockDevices.length,
  };

  const onlineDevices = mockDevices.filter(device => device.isOnline).length;

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
            trend="+0.5°C"
          />
          <MetricCard
            title="Humidity"
            value={averageMetrics.humidity.toFixed(1)}
            unit="%"
            icon={Droplets}
            gradient="humidity-gradient"
            trend="-2.1%"
          />
          <MetricCard
            title="Pressure"
            value={averageMetrics.pressure.toFixed(0)}
            unit="hPa"
            icon={Gauge}
            gradient="pressure-gradient"
            trend="+1.2 hPa"
          />
          <MetricCard
            title="Dew Point"
            value={averageMetrics.dewPoint.toFixed(1)}
            unit="°C"
            icon={Cloud}
            gradient="dewpoint-gradient"
            trend="+0.3°C"
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
                <span className="text-sm font-medium">{mockDevices.length - onlineDevices} Offline</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
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
            {mockDevices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <ChartView devices={mockDevices} selectedDevice={selectedDevice} />
        )}
      </main>
    </div>
  );
};

export default Index;
