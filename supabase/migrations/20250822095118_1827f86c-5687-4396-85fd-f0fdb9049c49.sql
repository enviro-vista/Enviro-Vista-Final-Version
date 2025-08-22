-- Check if uv_index column exists in sensor_readings table, add if missing
ALTER TABLE public.sensor_readings 
ADD COLUMN IF NOT EXISTS uv_index double precision;