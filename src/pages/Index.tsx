import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
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
  LogOut,
  CreditCard,
  User
} from "lucide-react";
import Header from "@/components/Header";
import SubscriptionStatusBadge from "@/components/SubscriptionStatusBadge";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useDevices } from "@/hooks/useDevices";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus, useCheckSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
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

// Lazy load heavy components
const MetricCard = lazy(() => import("@/components/MetricCard"));
const DeviceCard = lazy(() => import("@/components/DeviceCard"));
const ChartView = lazy(() => import("@/components/ChartView"));
const AddDeviceDialog = lazy(() => import("@/components/AddDeviceDialog"));

const Index = () => {
  const [activeView, setActiveView] = useState<'grid' | 'chart'>('grid');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { data: devices = [], isLoading } = useDevices();
  const { signOut } = useAuth();
  const { isPremium, isFree } = useSubscriptionStatus();
  const checkSubscription = useCheckSubscription();
  
  // Initialize state safely for SSR/SSG
  const [liveMonitoring, setLiveMonitoring] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  
  // Initialize state after component mounts (client-side only)
  useEffect(() => {
    setLiveMonitoring(JSON.parse(localStorage.getItem("settings.liveMonitoring") ?? "true"));
    setAlertsEnabled(JSON.parse(localStorage.getItem("settings.alertsEnabled") ?? "true"));
  }, []);

  // Memoized calculation of average metrics
  const averageMetrics = useMemo(() => {
    if (devices.length === 0) {
      return {
        temperature: 0,
        humidity: 0,
        pressure: 0,
        dewPoint: 0,
      };
    }

    const devicesWithReadings = devices.filter(device => device.latest_reading);
    if (devicesWithReadings.length === 0) {
      return {
        temperature: 0,
        humidity: 0,
        pressure: 0,
        dewPoint: 0,
      };
    }

    return {
      temperature: devicesWithReadings.reduce((sum, device) => sum + (device.latest_reading?.temperature || 0), 0) / devicesWithReadings.length,
      humidity: devicesWithReadings.reduce((sum, device) => sum + (device.latest_reading?.humidity || 0), 0) / devicesWithReadings.length,
      pressure: devicesWithReadings.reduce((sum, device) => sum + (device.latest_reading?.pressure || 0), 0) / devicesWithReadings.length,
      dewPoint: devicesWithReadings.reduce((sum, device) => sum + (device.latest_reading?.dew_point || 0), 0) / devicesWithReadings.length,
    };
  }, [devices]);

  // Memoized calculation of online devices
  const onlineDevices = useMemo(() => {
    return devices.filter(device => {
      if (!device.latest_reading) return false;
      try {
        const lastReading = new Date(device.latest_reading.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastReading.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 2; // Consider online if last reading was within 2 hours
      } catch (e) {
        return false;
      }
    }).length;
  }, [devices]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Show upgrade prompt for free users periodically and on first load
  useEffect(() => {
    if (isFree) {
      // Show immediately on first load
      setShowUpgradePrompt(true);
      
      // Show every 5 minutes for free users
      const interval = setInterval(() => {
        setShowUpgradePrompt(true);
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isFree]);

  // Refresh subscription status and handle payment verification
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const upgradeStatus = urlParams.get('upgrade');

    if (sessionId && upgradeStatus === 'success') {
      // Verify payment and upgrade user
      const verifyPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { session_id: sessionId }
          });

          if (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support if your payment was processed.",
              variant: "destructive"
            });
          } else if (data?.success) {
            toast({
              title: "🎉 Welcome to Premium!",
              description: "Your subscription has been activated successfully. Page will refresh in 3 seconds...",
            });
            // Refresh subscription status and then reload page
            setTimeout(() => {
              checkSubscription.mutate();
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }, 2000);
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          toast({
            title: "Payment Verification Failed", 
            description: "Please contact support if your payment was processed.",
            variant: "destructive"
          });
        }
      };

      verifyPayment();
    } else {
      // Normal subscription check on page load
      checkSubscription.mutate();
    }
  }, []);

  // Auto-refresh subscription status every 30 seconds for premium users
  useEffect(() => {
    if (isPremium) {
      const interval = setInterval(() => {
        checkSubscription.mutate();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isPremium]);

  const dismissUpgradePrompt = useCallback(() => {
    setShowUpgradePrompt(false);
    // Don't show again for 10 minutes
    setTimeout(() => {
      if (isFree) setShowUpgradePrompt(true);
    }, 10 * 60 * 1000);
  }, [isFree]);

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
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-3 py-4 space-y-4">
        
        {/* Upgrade Prompt for Free Users */}
        {isFree && showUpgradePrompt && (
          <div className="animate-slide-up">
            <UpgradePrompt 
              title="🚀 Unlock Premium Environmental Data" 
              description="Access CO₂ monitoring, advanced metrics, light sensors, and soil monitoring"
              onDismiss={dismissUpgradePrompt}
            />
          </div>
        )}
        
        {/* Overview Cards - Adjusted for mobile */}
        <div className="grid grid-cols-2 gap-3">
          <Suspense fallback={<div className="bg-muted rounded-lg h-24 animate-pulse"></div>}>
            <MetricCard
              title="Temp"
              value={averageMetrics.temperature.toFixed(1)}
              unit="°C"
              icon={Thermometer}
              gradient="temp-gradient"
              trend={devices.length > 0 ? "+0.5°C" : "No data"}
              compact
            />
          </Suspense>
          <Suspense fallback={<div className="bg-muted rounded-lg h-24 animate-pulse"></div>}>
            <MetricCard
              title="Humidity"
              value={averageMetrics.humidity.toFixed(1)}
              unit="%"
              icon={Droplets}
              gradient="humidity-gradient"
              trend={devices.length > 0 ? "-2.1%" : "No data"}
              compact
            />
          </Suspense>
          <Suspense fallback={<div className="bg-muted rounded-lg h-24 animate-pulse"></div>}>
            <MetricCard
              title="Pressure"
              value={averageMetrics.pressure.toFixed(0)}
              unit="hPa"
              icon={Gauge}
              gradient="pressure-gradient"
              trend={devices.length > 0 ? "+1.2 hPa" : "No data"}
              compact
            />
          </Suspense>
          <Suspense fallback={<div className="bg-muted rounded-lg h-24 animate-pulse"></div>}>
            <MetricCard
              title="Dew Point"
              value={averageMetrics.dewPoint.toFixed(1)}
              unit="°C"
              icon={Cloud}
              gradient="dewpoint-gradient"
              trend={devices.length > 0 ? "+0.3°C" : "No data"}
              compact
            />
          </Suspense>
        </div>

        {/* Status Summary - Adjusted for mobile */}
        <Card className="glass-card p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">{onlineDevices} Online</span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{devices.length - onlineDevices} Offline</span>
              </div>
              <SubscriptionStatusBadge />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="flex-1 min-w-[120px]">
                <Link to="/subscription">
                  <CreditCard className="h-3 w-3 mr-1" />
                  {isPremium ? 'Manage' : 'Upgrade'}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="flex-1 min-w-[100px]">
                <Link to="/billing">
                  <User className="h-3 w-3 mr-1" />
                  Billing
                </Link>
              </Button>
              <Suspense fallback={<Button variant="outline" size="sm" disabled>Add Device</Button>}>
                <AddDeviceDialog />
              </Suspense>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="Settings" className="px-3">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] max-w-md mx-auto rounded-lg">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Configure your dashboard preferences.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-medium">Live monitoring</p>
                        <p className="text-xs text-muted-foreground">Update dashboard in real time.</p>
                      </div>
                      <Switch checked={liveMonitoring} onCheckedChange={setLiveMonitoring} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-medium">Notifications</p>
                        <p className="text-xs text-muted-foreground">Enable alert popovers.</p>
                      </div>
                      <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                    </div>
                  </div>
                  <DialogFooter className="sm:justify-start">
                    <Button
                      className="w-full"
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
                      Save Settings
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="px-3">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* View Toggle - Adjusted for mobile */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Your Devices</h2>
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'grid' | 'chart')}>
            <TabsList className="h-9">
              <TabsTrigger value="grid" className="text-xs px-3">
                <Grid3X3 className="h-3 w-3 mr-1" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="chart" className="text-xs px-3">
                <BarChart3 className="h-3 w-3 mr-1" />
                Charts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        {activeView === 'grid' ? (
          <div className="space-y-4">
            {/* Inline upgrade prompt in data section for free users */}
            {isFree && (
              <UpgradePrompt 
                title="Premium Sensors & Metrics" 
                description="Unlock CO₂, light sensors, soil monitoring, and advanced calculated metrics"
                compact={true}
                onDismiss={() => {}}
              />
            )}
            
            <div className="grid grid-cols-1 gap-4">
              {devices.length > 0 ? (
                devices.map((device) => (
                  <Suspense key={device.id} fallback={<div className="bg-muted rounded-lg h-40 animate-pulse"></div>}>
                    <DeviceCard device={device} onDeviceUpdated={() => {}} />
                  </Suspense>
                ))
              ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground mb-4">No devices found. Add your first device to get started!</p>
                <Suspense fallback={<Button variant="default" disabled>Add Device</Button>}>
                  <AddDeviceDialog />
                </Suspense>
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden">
            <Suspense fallback={<div className="bg-muted rounded-lg h-64 animate-pulse"></div>}>
              <ChartView devices={devices} selectedDevice={selectedDevice} />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;