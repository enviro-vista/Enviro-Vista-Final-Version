-- 1) Enums and columns for subscription and roles
DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free','premium');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'free';

-- 2) Roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_premium()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()), 'free') = 'premium' OR public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium() TO authenticated;

-- 4) Policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5) sensor_readings table
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  temperature double precision,
  humidity double precision,
  pressure double precision,
  co2 double precision,
  light_veml7700 double precision,
  light_tsl2591 double precision,
  acceleration_x double precision,
  acceleration_y double precision,
  acceleration_z double precision,
  soil_capacitance double precision,
  battery_voltage double precision,
  battery_percentage double precision,
  dew_point double precision,
  wet_bulb_temp double precision,
  heat_index double precision,
  vpd double precision,
  absolute_humidity double precision,
  altitude double precision,
  weather_trend text,
  par double precision,
  soil_moisture_percentage double precision,
  battery_health double precision,
  shock_detected boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time ON public.sensor_readings (device_id, timestamp);

-- 6) Policies for sensor_readings (owner or admin)
DROP POLICY IF EXISTS "Users can view their own sensor readings" ON public.sensor_readings;
CREATE POLICY "Users can view their own sensor readings"
ON public.sensor_readings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = sensor_readings.device_id
      AND (d.owner_id = auth.uid() OR public.is_admin())
  )
);

-- 7) Admin policies on existing tables
DO $$ BEGIN
  CREATE POLICY "Admins can view all devices"
  ON public.devices
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update any device"
  ON public.devices
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete any device"
  ON public.devices
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all readings"
  ON public.readings
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8) View with masking for non-premium users
CREATE OR REPLACE VIEW public.sensor_readings_effective AS
SELECT
  sr.id, sr.device_id, sr.timestamp,
  sr.temperature,
  sr.humidity,
  sr.pressure,
  CASE WHEN public.is_premium() THEN sr.co2 ELSE NULL END AS co2,
  CASE WHEN public.is_premium() THEN sr.light_veml7700 ELSE NULL END AS light_veml7700,
  CASE WHEN public.is_premium() THEN sr.light_tsl2591 ELSE NULL END AS light_tsl2591,
  CASE WHEN public.is_premium() THEN sr.acceleration_x ELSE NULL END AS acceleration_x,
  CASE WHEN public.is_premium() THEN sr.acceleration_y ELSE NULL END AS acceleration_y,
  CASE WHEN public.is_premium() THEN sr.acceleration_z ELSE NULL END AS acceleration_z,
  CASE WHEN public.is_premium() THEN sr.soil_capacitance ELSE NULL END AS soil_capacitance,
  CASE WHEN public.is_premium() THEN sr.battery_voltage ELSE NULL END AS battery_voltage,
  CASE WHEN public.is_premium() THEN sr.battery_percentage ELSE NULL END AS battery_percentage,
  CASE WHEN public.is_premium() THEN sr.dew_point ELSE NULL END AS dew_point,
  CASE WHEN public.is_premium() THEN sr.wet_bulb_temp ELSE NULL END AS wet_bulb_temp,
  CASE WHEN public.is_premium() THEN sr.heat_index ELSE NULL END AS heat_index,
  CASE WHEN public.is_premium() THEN sr.vpd ELSE NULL END AS vpd,
  CASE WHEN public.is_premium() THEN sr.absolute_humidity ELSE NULL END AS absolute_humidity,
  CASE WHEN public.is_premium() THEN sr.altitude ELSE NULL END AS altitude,
  CASE WHEN public.is_premium() THEN sr.weather_trend ELSE NULL END AS weather_trend,
  CASE WHEN public.is_premium() THEN sr.par ELSE NULL END AS par,
  CASE WHEN public.is_premium() THEN sr.soil_moisture_percentage ELSE NULL END AS soil_moisture_percentage,
  CASE WHEN public.is_premium() THEN sr.battery_health ELSE NULL END AS battery_health,
  CASE WHEN public.is_premium() THEN sr.shock_detected ELSE NULL END AS shock_detected,
  sr.created_at
FROM public.sensor_readings sr;