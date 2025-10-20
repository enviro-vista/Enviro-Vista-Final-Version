import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { useReadings } from '@/hooks/useReadings';
import { useAllDevices } from '@/hooks/useDevices';

const DeviceDetails = () => {
  const { id } = useParams();
  const { isPremium } = useSubscriptionStatus();
  const { data: devices = [] } = useAllDevices();
  const device = devices.find((d: any) => d.id === id);
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [timePreset, setTimePreset] = useState('24h');
  
  const { data: readings = [], isLoading, error, isFetching } = useReadings(
    id, 
    timePreset === 'custom' ? '24h' : timePreset,
    timePreset === 'custom' ? dateRange : undefined
  );

  const averages = useMemo(() => {
    if (!readings.length) {
      return { temperature: 0, humidity: 0, pressure: 0, dewPoint: 0 };
    }

    const valid = readings.filter(r => r.temperature != null && r.humidity != null && r.pressure != null && r.dew_point != null);
    if (!valid.length) return { temperature: 0, humidity: 0, pressure: 0, dewPoint: 0 };

    const t = valid.reduce((s, r) => s + (r.temperature || 0), 0) / valid.length;
    const h = valid.reduce((s, r) => s + (r.humidity || 0), 0) / valid.length;
    const p = valid.reduce((s, r) => s + (r.pressure || 0), 0) / valid.length;
    const d = valid.reduce((s, r) => s + (r.dew_point || 0), 0) / valid.length;
    return { temperature: t, humidity: h, pressure: p, dewPoint: d };
  }, [readings]);

  // Debug logging
  console.log('DeviceDetails Debug:', {
    deviceId: id,
    timePreset,
    dateRange,
    readingsCount: readings.length,
    isLoading,
    isFetching,
    error: error?.message
  });

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

        {/* Debug Info */}
        <Card className="p-4 bg-muted/50">
          <div className="text-sm space-y-1">
            <p><strong>Device ID:</strong> {id}</p>
            <p><strong>Time Preset:</strong> {timePreset}</p>
            <p><strong>Custom Range:</strong> {timePreset === 'custom' ? 'Yes' : 'No'}</p>
            {timePreset === 'custom' && dateRange.from && dateRange.to && (
              <>
                <p><strong>From:</strong> {dateRange.from.toISOString()}</p>
                <p><strong>To:</strong> {dateRange.to.toISOString()}</p>
              </>
            )}
            <p><strong>Readings Count:</strong> {readings.length}</p>
          </div>
        </Card>

        {/* Averages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Temperature</p>
            {isFetching && !readings.length ? (
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-semibold">{averages.temperature.toFixed(1)}°C</p>
            )}
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Humidity</p>
            {isFetching && !readings.length ? (
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-semibold">{averages.humidity.toFixed(1)}%</p>
            )}
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Pressure</p>
            {isFetching && !readings.length ? (
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-semibold">{averages.pressure.toFixed(0)} hPa</p>
            )}
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Dew Point</p>
            {isFetching && !readings.length ? (
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-semibold">{averages.dewPoint.toFixed(1)}°C</p>
            )}
          </Card>
        </div>

        {/* Readings Table */}
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
                  </tr>
                </thead>
                <tbody>
                  {readings.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DeviceDetails;


