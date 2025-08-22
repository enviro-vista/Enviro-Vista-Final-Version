// Utility functions to manage data access based on subscription tier

export const FREE_TIER_FIELDS = [
  'temperature',
  'humidity', 
  'pressure',
  'dew_point',
  'co2'
] as const;

export const PREMIUM_TIER_FIELDS = [
  'vpd',
  'par',
  'uv_index',
  'weather_trend',
  'light_veml7700',
  'light_tsl2591',
  'acceleration_x',
  'acceleration_y', 
  'acceleration_z',
  'soil_moisture_percentage',
  'soil_capacitance',
  'battery_voltage',
  'battery_percentage',
  'battery_health',
  'shock_detected',
  'wet_bulb_temp',
  'heat_index',
  'absolute_humidity',
  'altitude'
] as const;

export type FreeFieldType = typeof FREE_TIER_FIELDS[number];
export type PremiumFieldType = typeof PREMIUM_TIER_FIELDS[number];
export type AllFieldType = FreeFieldType | PremiumFieldType;

export const isFreeTierField = (field: string): field is FreeFieldType => {
  return FREE_TIER_FIELDS.includes(field as FreeFieldType);
};

export const isPremiumField = (field: string): field is PremiumFieldType => {
  return PREMIUM_TIER_FIELDS.includes(field as PremiumFieldType);
};

export const getFieldLabel = (field: AllFieldType): string => {
  const labels: Record<AllFieldType, string> = {
    temperature: "Temperature",
    humidity: "Humidity",
    pressure: "Pressure", 
    dew_point: "Dew Point",
    co2: "CO₂",
    vpd: "VPD",
    par: "PAR",
    uv_index: "UV Index",
    weather_trend: "Weather Trend",
    light_veml7700: "Light (VEML7700)",
    light_tsl2591: "Light (TSL2591)",
    acceleration_x: "Acceleration X",
    acceleration_y: "Acceleration Y",
    acceleration_z: "Acceleration Z", 
    soil_moisture_percentage: "Soil Moisture %",
    soil_capacitance: "Soil Capacitance",
    battery_voltage: "Battery Voltage",
    battery_percentage: "Battery %",
    battery_health: "Battery Health",
    shock_detected: "Shock Detected",
    wet_bulb_temp: "Wet Bulb Temp",
    heat_index: "Heat Index",
    absolute_humidity: "Absolute Humidity",
    altitude: "Altitude"
  };
  
  return labels[field] || field;
};

export const getFieldUnit = (field: AllFieldType): string => {
  const units: Record<AllFieldType, string> = {
    temperature: "°C",
    humidity: "%",
    pressure: "hPa",
    dew_point: "°C", 
    co2: "ppm",
    vpd: "kPa",
    par: "μmol/m²/s",
    uv_index: "",
    weather_trend: "",
    light_veml7700: "lux",
    light_tsl2591: "lux",
    acceleration_x: "g",
    acceleration_y: "g",
    acceleration_z: "g",
    soil_moisture_percentage: "%",
    soil_capacitance: "",
    battery_voltage: "V",
    battery_percentage: "%",
    battery_health: "%",
    shock_detected: "",
    wet_bulb_temp: "°C",
    heat_index: "°C",
    absolute_humidity: "g/m³",
    altitude: "m"
  };
  
  return units[field] || "";
};