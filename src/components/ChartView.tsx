import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useReadings, DateRange, Reading } from "@/hooks/useReadings";
import { Device } from "@/hooks/useDevices";
import { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfDay,
  startOfHour,
  startOfMinute,
  differenceInDays,
  addDays,
} from "date-fns";

interface ChartViewProps {
  devices: Device[];
  selectedDevice?: string;
  timeRange?: string;
  customDateRange?: DateRange;
}

type RangeKind = 'minute' | 'hour' | 'day';

function getRangeKind(timeRange: string, customDateRange?: DateRange): RangeKind {
  if (customDateRange?.from && customDateRange?.to) {
    const days = differenceInDays(customDateRange.to, customDateRange.from);
    return days >= 1 ? 'day' : 'hour';
  }
  switch (timeRange) {
    case '1h':
      return 'minute';
    case '6h':
    case '12h':
    case '24h':
      return 'hour';
    case '3d':
    case '7d':
    case '14d':
    case '30d':
    case '90d':
      return 'day';
    default:
      return 'hour';
  }
}

function formatXLabel(date: Date, rangeKind: RangeKind, rangeLabelDate?: Date): string {
  if (Number.isNaN(date.getTime())) return '—';
  switch (rangeKind) {
    case 'minute':
      return format(date, 'HH:mm');
    case 'hour':
      return format(date, 'HH:mm');
    case 'day':
      return format(date, 'MMM d');
    default:
      return format(date, 'MMM d HH:mm');
  }
}

function getBucketKey(date: Date, rangeKind: RangeKind): string {
  if (Number.isNaN(date.getTime())) return '';
  switch (rangeKind) {
    case 'minute':
      return startOfMinute(date).toISOString();
    case 'hour':
      return startOfHour(date).toISOString();
    case 'day':
      return startOfDay(date).toISOString();
    default:
      return date.toISOString();
  }
}

function getDayRangeBounds(timeRange: string, customDateRange?: DateRange): { from: Date; to: Date } | null {
  const now = new Date();
  if (customDateRange?.from && customDateRange?.to) {
    return { from: startOfDay(customDateRange.from), to: startOfDay(customDateRange.to) };
  }
  const to = startOfDay(now);
  let from = new Date(now);
  switch (timeRange) {
    case '3d':
      from = addDays(to, -3);
      break;
    case '7d':
      from = addDays(to, -7);
      break;
    case '14d':
      from = addDays(to, -14);
      break;
    case '30d':
      from = addDays(to, -30);
      break;
    case '90d':
      from = addDays(to, -90);
      break;
    default:
      return null;
  }
  return { from: startOfDay(from), to };
}

function aggregateReadings(
  readings: Reading[],
  rangeKind: RangeKind,
  timeRange: string,
  customDateRange?: DateRange
): { time: string; timeDate: Date; temperature: number; humidity: number; pressure: number; dewPoint: number }[] {
  const valid = (readings ?? []).filter(
    (r) => r != null && (r.timestamp != null || r.created_at != null)
  );
  if (valid.length === 0 && rangeKind !== 'day') return [];

  const buckets = new Map<
    string,
    { date: Date; temps: number[]; hums: number[]; pressures: number[]; dews: number[] }
  >();

  for (const r of valid) {
    const ts = r.timestamp ?? r.created_at ?? '';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) continue;
    const key = getBucketKey(date, rangeKind);
    if (!key) continue;
    const existing = buckets.get(key);
    const temp = r.temperature ?? 0;
    const hum = r.humidity ?? 0;
    const press = r.pressure ?? 0;
    const dew = r.dew_point ?? 0;
    if (!existing) {
      buckets.set(key, {
        date,
        temps: [temp],
        hums: [hum],
        pressures: [press],
        dews: [dew],
      });
    } else {
      existing.temps.push(temp);
      existing.hums.push(hum);
      existing.pressures.push(press);
      existing.dews.push(dew);
    }
  }

  const avg = (arr: number[]) => {
    const filled = arr.filter((v) => v != null && !Number.isNaN(v));
    if (filled.length === 0) return 0;
    return filled.reduce((s, v) => s + v, 0) / filled.length;
  };

  const result = Array.from(buckets.entries()).map(([, b]) => {
    const date = b.date;
    return {
      time: formatXLabel(date, rangeKind),
      timeDate: date,
      temperature: avg(b.temps),
      humidity: avg(b.hums),
      pressure: avg(b.pressures),
      dewPoint: avg(b.dews),
    };
  });

  // For day range, fill in every day from range start to end so x-axis shows each day
  if (rangeKind === 'day') {
    const bounds = getDayRangeBounds(timeRange, customDateRange);
    const from = bounds?.from ?? (result.length ? new Date(Math.min(...result.map((r) => r.timeDate.getTime()))) : new Date());
    const to = bounds?.to ?? (result.length ? new Date(Math.max(...result.map((r) => r.timeDate.getTime()))) : new Date());
    const byDay = new Map<string, (typeof result)[0]>();
    result.forEach((row) => {
      const dayKey = startOfDay(row.timeDate).toISOString();
      byDay.set(dayKey, row);
    });
    let d = from.getTime();
    const end = to.getTime();
    const filled: (typeof result) = [];
    while (d <= end) {
      const day = new Date(d);
      const dayKey = startOfDay(day).toISOString();
      const existing = byDay.get(dayKey);
      filled.push(
        existing ?? {
          time: format(day, 'MMM d'),
          timeDate: day,
          temperature: 0,
          humidity: 0,
          pressure: 0,
          dewPoint: 0,
        }
      );
      d = addDays(day, 1).getTime();
    }
    return filled.sort((a, b) => a.timeDate.getTime() - b.timeDate.getTime());
  }

  return result.sort((a, b) => a.timeDate.getTime() - b.timeDate.getTime());
}

type SoilChartPoint = { time: string; timeDate: Date; soilTemperature: number; soilCapacitance: number; soilMoisture: number; batteryVoltage: number; battery: number; par: number };

function aggregateReadingsSoil(
  readings: Reading[],
  rangeKind: RangeKind,
  timeRange: string,
  customDateRange?: DateRange
): SoilChartPoint[] {
  const valid = (readings ?? []).filter(
    (r) => r != null && (r.timestamp != null || r.created_at != null)
  );
  if (valid.length === 0 && rangeKind !== 'day') return [];

  const buckets = new Map<
    string,
    { date: Date; soilTemps: number[]; soilCaps: number[]; soilMoists: number[]; batteryVs: number[]; batteries: number[]; pars: number[] }
  >();

  for (const r of valid) {
    const ts = r.timestamp ?? r.created_at ?? '';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) continue;
    const key = getBucketKey(date, rangeKind);
    if (!key) continue;
    const existing = buckets.get(key);
    const st = r.soil_temperature ?? 0;
    const sc = r.soil_capacitance ?? 0;
    const sm = r.soil_moisture_percentage ?? 0;
    const bv = r.battery_voltage ?? 0;
    const bat = r.battery_percentage ?? 0;
    const par = r.par ?? 0;
    if (!existing) {
      buckets.set(key, {
        date,
        soilTemps: [st],
        soilCaps: [sc],
        soilMoists: [sm],
        batteryVs: [bv],
        batteries: [bat],
        pars: [par],
      });
    } else {
      existing.soilTemps.push(st);
      existing.soilCaps.push(sc);
      existing.soilMoists.push(sm);
      existing.batteryVs.push(bv);
      existing.batteries.push(bat);
      existing.pars.push(par);
    }
  }

  const avg = (arr: number[]) => {
    const filled = arr.filter((v) => v != null && !Number.isNaN(v));
    if (filled.length === 0) return 0;
    return filled.reduce((s, v) => s + v, 0) / filled.length;
  };

  const result = Array.from(buckets.entries()).map(([, b]) => ({
    time: formatXLabel(b.date, rangeKind),
    timeDate: b.date,
    soilTemperature: avg(b.soilTemps),
    soilCapacitance: avg(b.soilCaps),
    soilMoisture: avg(b.soilMoists),
    batteryVoltage: avg(b.batteryVs),
    battery: avg(b.batteries),
    par: avg(b.pars),
  }));

  if (rangeKind === 'day') {
    const bounds = getDayRangeBounds(timeRange, customDateRange);
    const from = bounds?.from ?? (result.length ? new Date(Math.min(...result.map((r) => r.timeDate.getTime()))) : new Date());
    const to = bounds?.to ?? (result.length ? new Date(Math.max(...result.map((r) => r.timeDate.getTime()))) : new Date());
    const byDay = new Map<string, SoilChartPoint>();
    result.forEach((row) => {
      const dayKey = startOfDay(row.timeDate).toISOString();
      byDay.set(dayKey, row);
    });
    let d = from.getTime();
    const end = to.getTime();
    const filled: SoilChartPoint[] = [];
    while (d <= end) {
      const day = new Date(d);
      const dayKey = startOfDay(day).toISOString();
      const existing = byDay.get(dayKey);
      filled.push(
        existing ?? {
          time: format(day, 'MMM d'),
          timeDate: day,
          soilTemperature: 0,
          soilCapacitance: 0,
          soilMoisture: 0,
          batteryVoltage: 0,
          battery: 0,
          par: 0,
        }
      );
      d = addDays(day, 1).getTime();
    }
    return filled.sort((a, b) => a.timeDate.getTime() - b.timeDate.getTime());
  }

  return result.sort((a, b) => a.timeDate.getTime() - b.timeDate.getTime());
}

const ChartView = ({ devices, selectedDevice: propSelectedDevice, timeRange: propTimeRange, customDateRange }: ChartViewProps) => {
  const [selectedDevice, setSelectedDevice] = useState(propSelectedDevice || 'all');
  const [timeRange, setTimeRange] = useState(propTimeRange || '24h');
  
  // Update local state when props change
  useEffect(() => {
    if (propSelectedDevice !== undefined) {
      setSelectedDevice(propSelectedDevice);
    }
  }, [propSelectedDevice]);

  useEffect(() => {
    if (propTimeRange !== undefined) {
      setTimeRange(propTimeRange);
    }
  }, [propTimeRange]);
  
  const { data: readings = [], isLoading } = useReadings(
    selectedDevice === 'all' ? undefined : selectedDevice,
    timeRange,
    customDateRange
  );

  const rangeKind = useMemo(
    () => getRangeKind(timeRange ?? '24h', customDateRange),
    [timeRange, customDateRange]
  );

  const isSoilChart = devices.length === 1 && devices[0].device_type === 'SOIL';

  const chartData = useMemo(
    () =>
      isSoilChart
        ? aggregateReadingsSoil(readings, rangeKind, timeRange ?? '24h', customDateRange)
        : aggregateReadings(readings, rangeKind, timeRange ?? '24h', customDateRange),
    [readings, rangeKind, timeRange, customDateRange, isSoilChart]
  );

  // Axis label at the bottom of the graph (below the ticks)
  const xAxisLabel = useMemo(() => {
    if (chartData.length === 0) return undefined;
    const refDate = chartData[0].timeDate;
    if (rangeKind === 'minute' || rangeKind === 'hour') {
      return format(refDate, 'yyyy, MMMM d');
    }
    if (rangeKind === 'day') {
      return format(refDate, 'yyyy MMMM');
    }
    return undefined;
  }, [rangeKind, chartData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {devices.length > 1 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {!propTimeRange && (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isSoilChart ? (
            <>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full temp-gradient"></div>
                  Soil Temperature
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="soilTemperature" stroke="hsl(var(--temperature))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full humidity-gradient"></div>
                  Soil Moisture
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="soilMoisture" stroke="hsl(var(--humidity))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-600 to-amber-800"></div>
                  Soil Capacitance
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[800, 2800]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="soilCapacitance" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-600"></div>
                  Battery Voltage
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[2.4, 4.2]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="batteryVoltage" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-600"></div>
                  Battery %
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="battery" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500"></div>
                  PAR
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="par" stroke="hsl(var(--premium))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
            </>
          ) : (
            <>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full temp-gradient"></div>
                  Temperature
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="temperature" stroke="hsl(var(--temperature))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full humidity-gradient"></div>
                  Humidity
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="humidity" stroke="hsl(var(--humidity))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full pressure-gradient"></div>
                  Atmospheric Pressure
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="pressure" stroke="hsl(var(--pressure))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
              <Card className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full dewpoint-gradient"></div>
                  Dew Point
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="dewPoint" stroke="hsl(var(--dewpoint))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {xAxisLabel && <p className="text-center text-sm font-medium text-foreground mt-2 pt-2 border-t border-border/50">{xAxisLabel}</p>}
              </Card>
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No readings available for the selected time range.</p>
        </div>
      )}
    </div>
  );
};

export default ChartView;
