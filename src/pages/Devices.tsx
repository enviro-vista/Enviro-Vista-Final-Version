import { useState, Suspense, lazy } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity,
  BarChart3,
  Grid3X3,
  Plus,
  Search,
  Filter
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAllDevices } from "@/hooks/useDevices";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Lazy load heavy components
const DeviceCard = lazy(() => import("@/components/DeviceCard"));
const ChartView = lazy(() => import("@/components/ChartView"));
const AddDeviceDialog = lazy(() => import("@/components/AddDeviceDialog"));

const Devices = () => {
  const [activeView, setActiveView] = useState<'grid' | 'chart'>('grid');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');
  const { data: devices = [], isLoading } = useAllDevices();

  // Filter devices based on search term and device type
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.device_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = deviceTypeFilter === 'all' || device.device_type === deviceTypeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading devices...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Device Management"
      subtitle="Manage and monitor your environmental sensors"
      breadcrumbs={[{ title: "Devices" }]}
    >
      <div className="space-y-6">
        
        {/* Search and Filter Controls */}
        <Card className="glass-card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
                {/*
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              */}
            </div>
            <div className="flex gap-2">
              {/*<Select value={deviceTypeFilter} onValueChange={setDeviceTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="AIR">Air Sensors</SelectItem>
                  <SelectItem value="SOIL">Soil Sensors</SelectItem>
                </SelectContent>
              </Select>*/}
              <Suspense fallback={<Button disabled><Plus className="h-4 w-4 mr-2" />Add Device</Button>}>
                <AddDeviceDialog />
              </Suspense>
            </div>
          </div>
        </Card>

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Your Devices ({filteredDevices.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              {searchTerm || deviceTypeFilter !== 'all' 
                ? `Filtered results from ${devices.length} total devices`
                : 'Manage and monitor your environmental sensors'
              }
            </p>
          </div>
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'grid' | 'chart')}>
            <TabsList className="h-9">
              <TabsTrigger value="grid" className="text-xs px-3">
                <Grid3X3 className="h-3 w-3 mr-1" />
                Grid
              </TabsTrigger>
              {/* <TabsTrigger value="chart" className="text-xs px-3">
                <BarChart3 className="h-3 w-3 mr-1" />
                Charts
              </TabsTrigger> */}
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        {activeView === 'grid' ? (
          <div className="space-y-4">
            {filteredDevices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDevices.map((device) => (
                  <Suspense key={device.id} fallback={<div className="bg-muted rounded-lg h-40 animate-pulse"></div>}>
                    <DeviceCard device={device as any} onDeviceUpdated={() => {}} />
                  </Suspense>
                ))}
              </div>
            ) : (
              <Card className="glass-card p-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || deviceTypeFilter !== 'all' ? 'No devices found' : 'No devices yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || deviceTypeFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Add your first device to start monitoring environmental data.'
                  }
                </p>
                {!searchTerm && deviceTypeFilter === 'all' && (
                  <Suspense fallback={<Button variant="default" disabled>Add Device</Button>}>
                    <AddDeviceDialog />
                  </Suspense>
                )}
              </Card>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <Suspense fallback={<div className="bg-muted rounded-lg h-64 animate-pulse"></div>}>
              <ChartView devices={devices as any} selectedDevice={selectedDevice} />
            </Suspense>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Devices;
