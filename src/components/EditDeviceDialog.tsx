import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useUpdateDevice, Device } from '@/hooks/useDevices';
import { useToast } from '@/hooks/use-toast';

interface EditDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  onDeviceUpdated: () => void;
}

const EditDeviceDialog = ({ 
  open, 
  onOpenChange, 
  device,
  onDeviceUpdated
}: EditDeviceDialogProps) => {
  const [name, setName] = useState(device.name);
  const [deviceType, setDeviceType] = useState<'AIR' | 'SOIL'>(device.device_type);
  const [cropType, setCropType] = useState(device.crop_type || '');
  const updateDevice = useUpdateDevice();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDevice.mutateAsync({ 
        id: device.id, 
        name,
        device_type: deviceType,
        crop_type: cropType.trim() || null
      });
      
      toast({
        title: "Device Updated",
        description: `"${device.name}" has been updated successfully.`,
      });
      
      onDeviceUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update device. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Device</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-name">Device Name</Label>
            <Input
              id="device-name"
              placeholder="Enter new device name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={50}
            />
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateDevice.isPending || (name.trim() === device.name && deviceType === device.device_type && (cropType.trim() || null) === device.crop_type)}
            >
              {updateDevice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDeviceDialog;
