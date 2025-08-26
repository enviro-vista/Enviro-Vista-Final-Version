-- Add device_type column to devices table
ALTER TABLE public.devices 
ADD COLUMN device_type TEXT NOT NULL DEFAULT 'AIR' 
CHECK (device_type IN ('AIR', 'SOIL'));

-- Update existing devices to have AIR as default type
UPDATE public.devices SET device_type = 'AIR' WHERE device_type IS NULL;

-- Create index for device_type for better query performance
CREATE INDEX idx_devices_device_type ON public.devices(device_type);

