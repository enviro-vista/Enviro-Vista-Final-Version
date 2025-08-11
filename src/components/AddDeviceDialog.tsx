
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { useAddDevice } from '@/hooks/useDevices';

const AddDeviceDialog = () => {
  const [open, setOpen] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const addDevice = useAddDevice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await addDevice.mutateAsync({ device_id: deviceId, name });
      setDeviceToken(res?.token ?? null);
      setDeviceId('');
      setName('');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addDevice.isPending}>
                {addDevice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Device
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy this device token and paste it into your ESP32 firmware. Store it securely; you won't be able to view it again.
            </p>
            <div className="space-y-2">
              <Label>Device JWT</Label>
              <Input readOnly value={deviceToken} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(deviceToken)}
                >
                  Copy Token
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setDeviceToken(null);
                    setOpen(false);
                  }}
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
