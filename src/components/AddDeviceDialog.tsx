import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAddDevice, useDevices, useValidateDeviceId } from '@/hooks/useDevices';

const AddDeviceDialog = () => {
  const [open, setOpen] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [deviceType, setDeviceType] = useState<'AIR' | 'SOIL'>('AIR');
  const [cropType, setCropType] = useState<string>('');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; checked: boolean; isUsed?: boolean; macAddress?: string | null } | null>(null);
  
  const addDevice = useAddDevice();
  const validateDeviceId = useValidateDeviceId();
  const { data: existingDevices } = useDevices();
  
  // Check if device MAC address is already taken (compare with MAC address from validation)
  const isDeviceIdTaken = validationResult?.macAddress 
    ? existingDevices?.some(device => 
        device.device_id.toLowerCase() === validationResult.macAddress?.toLowerCase()
      )
    : false;

  // Validate device ID when user stops typing
  useEffect(() => {
    if (!deviceId.trim()) {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await validateDeviceId.mutateAsync(deviceId.trim());
        setValidationResult({ 
          isValid: result.isValid, 
          checked: true,
          isUsed: result.isUsed,
          macAddress: result.macAddress
        });
      } catch (error) {
        setValidationResult({ isValid: false, checked: true });
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [deviceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!deviceId.trim() || !name.trim()) {
      return;
    }

    // Check if device ID is valid
    if (!validationResult?.isValid) {
      return;
    }
    
    try {
      const res = await addDevice.mutateAsync({ 
        device_id: deviceId.trim(), 
        name: name.trim(), 
        device_type: deviceType,
        crop_type: cropType.trim() || null
      });
      setDeviceToken(res.token);
      setDeviceId('');
      setName('');
      setDeviceType('AIR');
      setCropType('');
      setValidationResult(null);
    } catch (error) {
      // Error is handled by the mutation
      // Keep the form open so user can fix the issue
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setDeviceToken(null);
        setValidationResult(null);
        setDeviceId('');
        setName('');
        setDeviceType('AIR');
        setCropType('');
      }
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{deviceToken ? 'Device Registered' : 'Add New Device'}</DialogTitle>
        </DialogHeader>
        
        {!deviceToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-id">Device ID (QR Code or MAC Address)</Label>
              <div className="relative">
                <Input
                  id="device-id"
                  placeholder="Enter QR code or MAC address"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  required
                  className={
                    validationResult?.checked
                      ? validationResult.isValid
                        ? 'border-green-500 focus-visible:ring-green-500'
                        : 'border-red-500 focus-visible:ring-red-500'
                      : ''
                  }
                />
                {validateDeviceId.isPending && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {validationResult?.checked && validationResult.isValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the QR code or MAC address from your device. This will be validated against our device registry.
              </p>
              {deviceId && isDeviceIdTaken && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-500 p-2 rounded-md">
                  <AlertTriangle className="h-3 w-3" />
                  This device is already registered to your account.
                </div>
              )}
              {validationResult?.checked && !validationResult.isValid && validationResult.isUsed && !isDeviceIdTaken && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-500 p-2 rounded-md">
                  <AlertTriangle className="h-3 w-3" />
                  This device has already been registered. Please contact support if you believe this is an error.
                </div>
              )}
              {validationResult?.checked && !validationResult.isValid && !validationResult.isUsed && !isDeviceIdTaken && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-500 p-2 rounded-md">
                  <AlertTriangle className="h-3 w-3" />
                  Invalid device ID. Please check your QR code or MAC address.
                </div>
              )}
              {validationResult?.checked && validationResult.isValid && !isDeviceIdTaken && (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-500 p-2 rounded-md">
                  <CheckCircle2 className="h-3 w-3" />
                  Valid device found! You can proceed with registration.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-type">Device Type</Label>
              <Select value={deviceType} onValueChange={(value: 'AIR' | 'SOIL') => setDeviceType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AIR">Air Quality Sensor</SelectItem>
                  <SelectItem value="SOIL">Soil Moisture Sensor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                placeholder="Living Room Sensor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crop-type">Crop Type (Optional)</Label>
              <Input
                id="crop-type"
                placeholder="e.g., Tomato, Lettuce, Basil, etc."
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Specify what crop or plant you're monitoring (optional but helpful for organization).
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  addDevice.isPending || 
                  isDeviceIdTaken || 
                  !deviceId.trim() || 
                  !name.trim() ||
                  validateDeviceId.isPending ||
                  !validationResult?.isValid
                }
              >
                {addDevice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Device
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy this device token and paste it into your ESP32 firmware. 
              Store it securely; you won't be able to view it again.
            </p>
            <div className="space-y-2">
              <Label>Device JWT</Label>
              <Input 
                readOnly 
                value={deviceToken} 
                onFocus={(e) => e.currentTarget.select()} 
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(deviceToken || '')}
                >
                  Copy Token
                </Button>
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceDialog;