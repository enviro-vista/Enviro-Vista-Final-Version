import { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { useReadings } from '@/hooks/useReadings';
import { useAllDevices } from '@/hooks/useDevices';
import { exportToCSV, exportToJSON, downloadFile, generateFilename } from '@/utils/dataExport';
import { Download, FileText, BarChart3, Table2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ChartView = lazy(() => import('@/components/ChartView'));

const DeviceDetails = () => {
  const { id } = useParams();
  const { isPremium } = useSubscriptionStatus();
  const { data: devices = [] } = useAllDevices();
  const device = devices.find((d: any) => d.id === id);
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [timePreset, setTimePreset] = useState('24h');
  const [activeView, setActiveView] = useState<'table' | 'chart'>('table');
  
  const { data: readings = [], isLoading, error, isFetching } = useReadings(
    id, 
    timePreset === 'custom' ? '24h' : timePreset,
    timePreset === 'custom' ? dateRange : undefined
  );

  const isSoil = device?.device_type === 'SOIL';

  const averages = useMemo(() => {
    if (!readings.length) {
      return isSoil
        ? { soilTemperature: 0, soilCapacitance: 0, soilMoisture: 0, batteryVoltage: 0, battery: 0, par: 0 }
        : { temperature: 0, humidity: 0, pressure: 0, dewPoint: 0 };
    }
    if (isSoil) {
      const withSoilTemp = readings.filter(r => r.soil_temperature != null);
      const withSoilCap = readings.filter(r => r.soil_capacitance != null);
      const withSoilMoist = readings.filter(r => r.soil_moisture_percentage != null);
      const withBatteryV = readings.filter(r => r.battery_voltage != null);
      const withBattery = readings.filter(r => r.battery_percentage != null);
      const withPar = readings.filter(r => r.par != null);
      return {
        soilTemperature: withSoilTemp.length ? withSoilTemp.reduce((s, r) => s + (r.soil_temperature ?? 0), 0) / withSoilTemp.length : 0,
        soilCapacitance: withSoilCap.length ? withSoilCap.reduce((s, r) => s + (r.soil_capacitance ?? 0), 0) / withSoilCap.length : 0,
        soilMoisture: withSoilMoist.length ? withSoilMoist.reduce((s, r) => s + (r.soil_moisture_percentage ?? 0), 0) / withSoilMoist.length : 0,
        batteryVoltage: withBatteryV.length ? withBatteryV.reduce((s, r) => s + (r.battery_voltage ?? 0), 0) / withBatteryV.length : 0,
        battery: withBattery.length ? withBattery.reduce((s, r) => s + (r.battery_percentage ?? 0), 0) / withBattery.length : 0,
        par: withPar.length ? withPar.reduce((s, r) => s + (r.par ?? 0), 0) / withPar.length : 0,
      };
    }
    const valid = readings.filter(r => r.temperature != null && r.humidity != null && r.pressure != null && r.dew_point != null);
    if (!valid.length) return { temperature: 0, humidity: 0, pressure: 0, dewPoint: 0 };
    const t = valid.reduce((s, r) => s + (r.temperature || 0), 0) / valid.length;
    const h = valid.reduce((s, r) => s + (r.humidity || 0), 0) / valid.length;
    const p = valid.reduce((s, r) => s + (r.pressure || 0), 0) / valid.length;
    const d = valid.reduce((s, r) => s + (r.dew_point || 0), 0) / valid.length;
    return { temperature: t, humidity: h, pressure: p, dewPoint: d };
  }, [readings, isSoil]);

  // Export handlers
  const handleExportCSV = () => {
    if (readings.length === 0) {
      toast({
        title: "No Data",
        description: "There are no readings to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvContent = exportToCSV(readings, device?.name, device?.device_type);
      const filename = generateFilename(device?.name || 'device', 'csv', dateRange);
      downloadFile(csvContent, filename, 'text/csv');
      toast({
        title: "Export Successful",
        description: `Exported ${readings.length} readings to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportJSON = () => {
    if (readings.length === 0) {
      toast({
        title: "No Data",
        description: "There are no readings to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const jsonContent = exportToJSON(readings, device?.name, device?.device_type);
      const filename = generateFilename(device?.name || 'device', 'json', dateRange);
      downloadFile(jsonContent, filename, 'application/json');
      toast({
        title: "Export Successful",
        description: `Exported ${readings.length} readings to JSON.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Only show full loading screen on initial load, not on refetches
  if (isLoading && !readings.length) {
    return (
      <AppLayout title={device?.name || 'Device'} subtitle={device?.device_id} breadcrumbs={[{ title: 'Dashboard', href: '/' }, { title: 'Devices', href: '/devices' }, { title: device?.name || 'Device' }] }>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading readings...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title={device?.name || 'Device'} subtitle={device?.device_id} breadcrumbs={[{ title: 'Dashboard', href: '/' }, { title: 'Devices', href: '/devices' }, { title: device?.name || 'Device' }] }>
        <div className="space-y-6">
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            onPresetChange={setTimePreset}
            preset={timePreset}
          />
          <Card className="p-6 text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <p className="text-sm text-muted-foreground">
              Device ID: {id} | Time Range: {timePreset} | Custom Range: {timePreset === 'custom' ? 'Yes' : 'No'}
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={device?.name || 'Device'} subtitle={device?.device_id} breadcrumbs={[{ title: 'Dashboard', href: '/' }, { title: 'Devices', href: '/devices' }, { title: device?.name || 'Device' }] }>
      <div className="space-y-6">
        {/* Date Range Filter */}
        <div className="relative">
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            onPresetChange={setTimePreset}
            preset={timePreset}
          />
          {isFetching && (
            <div className="absolute top-2 right-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>

        {/* Action Bar - Export and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'table' | 'chart')}>
              <TabsList>
                <TabsTrigger value="table">
                  <Table2 className="h-4 w-4 mr-2" />
                  Table
                </TabsTrigger>
                <TabsTrigger value="chart">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Charts
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {readings.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={readings.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={readings.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          )}
        </div>

        {/* Averages - by device type */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isSoil ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
          {isSoil ? (
            <>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Soil Temp</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { soilTemperature: number }).soilTemperature.toFixed(1)}°C</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Soil Capacitance</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { soilCapacitance: number }).soilCapacitance.toFixed(1)}</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Soil Moisture</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { soilMoisture: number }).soilMoisture.toFixed(1)}%</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Battery Voltage</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { batteryVoltage: number }).batteryVoltage.toFixed(2)} V</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Battery</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { battery: number }).battery.toFixed(0)}%</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">PAR</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { par: number }).par.toFixed(0)} µmol</p>
                )}
              </Card>
            </>
          ) : (
            <>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Temperature</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { temperature: number }).temperature.toFixed(1)}°C</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Humidity</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { humidity: number }).humidity.toFixed(1)}%</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Pressure</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { pressure: number }).pressure.toFixed(0)} hPa</p>
                )}
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Dew Point</p>
                {isFetching && !readings.length ? (
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                ) : (
                  <p className="text-2xl font-semibold">{(averages as { dewPoint: number }).dewPoint.toFixed(1)}°C</p>
                )}
              </Card>
            </>
          )}
        </div>

        {/* Readings Table or Charts */}
        {activeView === 'table' ? (
          <div className={`bg-card rounded-lg border transition-opacity duration-200 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Readings</h3>
            </div>
            
            {isFetching && !readings.length ? (
              <div className="p-8">
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex space-x-4">
                      <div className="h-4 bg-muted animate-pulse rounded flex-1"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                      <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                      {isPremium && (
                        <>
                          <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                          <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                          <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                          <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : readings.length === 0 ? (
              <div className="p-8 text-center">
                <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  No readings found for the selected time range.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try selecting a different time range or check if the device is sending data.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-4 py-2">Timestamp</th>
                      {isSoil ? (
                        <>
                          <th className="px-4 py-2">Soil Temp (°C)</th>
                          <th className="px-4 py-2">Soil Capacitance</th>
                          <th className="px-4 py-2">Soil Moist (%)</th>
                          <th className="px-4 py-2">Battery Voltage (V)</th>
                          <th className="px-4 py-2">Battery (%)</th>
                          <th className="px-4 py-2">PAR (µmol)</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-2">Temp (°C)</th>
                          <th className="px-4 py-2">Humidity (%)</th>
                          <th className="px-4 py-2">Pressure (hPa)</th>
                          <th className="px-4 py-2">Dew Point (°C)</th>
                          {isPremium && (
                            <>
                              <th className="px-4 py-2">CO₂ (ppm)</th>
                              <th className="px-4 py-2">Light (lux)</th>
                              <th className="px-4 py-2">Soil Moist (%)</th>
                              <th className="px-4 py-2">Battery (%)</th>
                            </>
                          )}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="px-4 py-2 whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</td>
                        {isSoil ? (
                          <>
                            <td className="px-4 py-2">{r.soil_temperature?.toFixed(1) ?? '-'}</td>
                            <td className="px-4 py-2">{r.soil_capacitance != null ? r.soil_capacitance.toFixed(1) : '-'}</td>
                            <td className="px-4 py-2">{r.soil_moisture_percentage?.toFixed(1) ?? '-'}</td>
                            <td className="px-4 py-2">{r.battery_voltage != null ? r.battery_voltage.toFixed(2) : '-'}</td>
                            <td className="px-4 py-2">{r.battery_percentage?.toFixed(0) ?? '-'}</td>
                            <td className="px-4 py-2">{r.par?.toFixed(0) ?? '-'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2">{r.temperature?.toFixed(1) ?? '-'}</td>
                            <td className="px-4 py-2">{r.humidity?.toFixed(1) ?? '-'}</td>
                            <td className="px-4 py-2">{r.pressure?.toFixed(0) ?? '-'}</td>
                            <td className="px-4 py-2">{r.dew_point?.toFixed(1) ?? '-'}</td>
                            {isPremium && (
                              <>
                                <td className="px-4 py-2">{r.co2 ?? '-'}</td>
                                <td className="px-4 py-2">{r.light_veml7700 ?? r.light_tsl2591 ?? '-'}</td>
                                <td className="px-4 py-2">{r.soil_moisture_percentage?.toFixed(1) ?? '-'}</td>
                                <td className="px-4 py-2">{r.battery_percentage?.toFixed(0) ?? '-'}</td>
                              </>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading charts...</p>
                </div>
              </div>
            }>
              <ChartView 
                devices={device ? [device] : []} 
                selectedDevice={id || 'all'}
                timeRange={timePreset === 'custom' ? '24h' : timePreset}
                customDateRange={timePreset === 'custom' ? dateRange : undefined}
              />
            </Suspense>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DeviceDetails;


