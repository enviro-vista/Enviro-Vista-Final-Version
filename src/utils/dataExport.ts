/**
 * Data export utilities for sensor readings
 */

export interface Reading {
  id: string;
  timestamp: string;
  temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  dew_point?: number | null;
  co2?: number | null;
  light_veml7700?: number | null;
  light_tsl2591?: number | null;
  soil_moisture_percentage?: number | null;
  battery_percentage?: number | null;
  battery_voltage?: number | null;
  [key: string]: any;
}

/**
 * Convert readings array to CSV format
 */
export function exportToCSV(readings: Reading[], deviceName?: string): string {
  if (readings.length === 0) {
    return '';
  }

  // Get all unique keys from readings
  const keys = new Set<string>();
  readings.forEach(reading => {
    Object.keys(reading).forEach(key => {
      if (key !== 'id' && key !== 'device_id') {
        keys.add(key);
      }
    });
  });

  const headers = Array.from(keys).sort();
  
  // Create CSV header
  const csvHeaders = ['Timestamp', ...headers.map(h => formatHeader(h))];
  const csvRows = [csvHeaders.join(',')];

  // Add data rows
  readings.forEach(reading => {
    const row = [
      new Date(reading.timestamp).toISOString(),
      ...headers.map(header => {
        const value = reading[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in CSV
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Convert readings array to JSON format
 */
export function exportToJSON(readings: Reading[], deviceName?: string): string {
  const exportData = {
    device_name: deviceName || 'Unknown Device',
    export_date: new Date().toISOString(),
    total_readings: readings.length,
    readings: readings.map(reading => ({
      timestamp: reading.timestamp,
      temperature: reading.temperature ?? null,
      humidity: reading.humidity ?? null,
      pressure: reading.pressure ?? null,
      dew_point: reading.dew_point ?? null,
      co2: reading.co2 ?? null,
      light_veml7700: reading.light_veml7700 ?? null,
      light_tsl2591: reading.light_tsl2591 ?? null,
      soil_moisture_percentage: reading.soil_moisture_percentage ?? null,
      battery_percentage: reading.battery_percentage ?? null,
      battery_voltage: reading.battery_voltage ?? null,
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download data as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format header names for CSV (e.g., "dew_point" -> "Dew Point")
 */
function formatHeader(header: string): string {
  return header
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate filename with device name and date range
 */
export function generateFilename(
  deviceName: string,
  format: 'csv' | 'json',
  dateRange?: { from?: Date; to?: Date }
): string {
  const deviceSlug = deviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dateStr = dateRange?.from && dateRange?.to
    ? `${formatDate(dateRange.from)}_to_${formatDate(dateRange.to)}`
    : new Date().toISOString().split('T')[0];
  
  return `enviro-vista-${deviceSlug}-${dateStr}.${format}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
