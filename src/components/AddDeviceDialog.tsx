import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';
import { useAddDevice, useDevices } from '@/hooks/useDevices';

const AddDeviceDialog = () => {
  const [open, setOpen] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [deviceType, setDeviceType] = useState<'AIR' | 'SOIL'>('AIR');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const addDevice = useAddDevice();
  const { data: existingDevices } = useDevices();
  
  // Check if device ID is already taken
  const isDeviceIdTaken = existingDevices?.some(device => 
    device.device_id.toLowerCase() === deviceId.toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!deviceId.trim() || !name.trim()) {
      return;
    }
    
    try {
      const res = await addDevice.mutateAsync({ device_id: deviceId.trim(), name: name.trim(), device_type: deviceType });
      setDeviceToken(res.token);
      setDeviceId('');
      setName('');
      setDeviceType('AIR');
    } catch (error) {
      // Error is handled by the mutation
      // Keep the form open so user can fix the issue
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setDeviceToken(null);
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
              <Label htmlFor="device-id">Device ID</Label>
              <Input
                id="device-id"
                placeholder="ESP32_001"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Device ID must be unique across all users. Use a descriptive name like "ESP32_001" or "LivingRoom_Sensor".
              </p>
              {deviceId && isDeviceIdTaken && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                  <AlertTriangle className="h-3 w-3" />
                  This device ID is already in use. Please choose a different one.
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
                disabled={addDevice.isPending || isDeviceIdTaken || !deviceId.trim() || !name.trim()}
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