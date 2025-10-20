import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bell, Crown, Lock, Info, Save } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { 
  useNotificationSettings, 
  useUpsertNotificationSetting,
  READING_TYPES,
  ReadingType,
  NotificationSettingInput
} from '@/hooks/useNotificationSettings';
import UpgradePrompt from '@/components/UpgradePrompt';

interface NotificationSettingRowProps {
  readingType: ReadingType;
  setting: {
    reading_type: string;
    is_enabled: boolean;
    min_threshold: number | null;
    max_threshold: number | null;
  };
  isPremium: boolean;
  onUpdate: (input: NotificationSettingInput) => void;
  isUpdating: boolean;
}

const NotificationSettingRow = ({ 
  readingType, 
  setting, 
  isPremium, 
  onUpdate, 
  isUpdating 
}: NotificationSettingRowProps) => {
  const [localSetting, setLocalSetting] = useState(setting);
  const [hasChanges, setHasChanges] = useState(false);
  const readingInfo = READING_TYPES[readingType];
  
  const canAccess = !readingInfo.isPremium || isPremium;

  const handleToggle = (enabled: boolean) => {
    const newSetting = { ...localSetting, is_enabled: enabled };
    setLocalSetting(newSetting);
    setHasChanges(true);
  };

  const handleThresholdChange = (field: 'min_threshold' | 'max_threshold', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const newSetting = { ...localSetting, [field]: numValue };
    setLocalSetting(newSetting);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate({
      reading_type: readingType,
      is_enabled: localSetting.is_enabled,
      min_threshold: localSetting.min_threshold,
      max_threshold: localSetting.max_threshold,
    });
    setHasChanges(false);
  };

  if (!canAccess) {
    return (
      <Card className="border-muted-foreground/20 bg-muted/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">{readingInfo.label}</span>
                  <Badge variant="outline" className="text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  Unit: {readingInfo.unit || 'N/A'}
                </span>
              </div>
            </div>
            <div className="text-muted-foreground">
              <Lock className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{readingInfo.label}</span>
                  {readingInfo.isPremium && (
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  Unit: {readingInfo.unit || 'N/A'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="h-8"
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              )}
              <Switch
                checked={localSetting.is_enabled}
                onCheckedChange={handleToggle}
                disabled={isUpdating}
              />
            </div>
          </div>

          {localSetting.is_enabled && readingType !== 'shock_detected' && readingType !== 'weather_trend' && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor={`min-${readingType}`} className="text-sm font-medium">
                  Min Threshold
                </Label>
                <Input
                  id={`min-${readingType}`}
                  type="number"
                  step="0.1"
                  placeholder="Min value"
                  value={localSetting.min_threshold ?? ''}
                  onChange={(e) => handleThresholdChange('min_threshold', e.target.value)}
                  disabled={isUpdating}
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`max-${readingType}`} className="text-sm font-medium">
                  Max Threshold
                </Label>
                <Input
                  id={`max-${readingType}`}
                  type="number"
                  step="0.1"
                  placeholder="Max value"
                  value={localSetting.max_threshold ?? ''}
                  onChange={(e) => handleThresholdChange('max_threshold', e.target.value)}
                  disabled={isUpdating}
                  className="h-8"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const NotificationSettings = () => {
  const { isPremium } = useSubscriptionStatus();
  const { data: settings = [], isLoading } = useNotificationSettings();
  const upsertSetting = useUpsertNotificationSetting();

  // Create a map of existing settings for quick lookup
  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.reading_type] = setting;
    return acc;
  }, {} as Record<string, any>);

  // Get setting for a reading type, with defaults
  const getSetting = (readingType: ReadingType) => {
    return settingsMap[readingType] || {
      reading_type: readingType,
      is_enabled: false,
      min_threshold: null,
      max_threshold: null,
    };
  };

  const handleUpdateSetting = (input: NotificationSettingInput) => {
    upsertSetting.mutate(input);
  };

  // Separate readings by subscription tier
  const freeReadings = Object.keys(READING_TYPES).filter(
    type => !READING_TYPES[type as ReadingType].isPremium
  ) as ReadingType[];

  const premiumReadings = Object.keys(READING_TYPES).filter(
    type => READING_TYPES[type as ReadingType].isPremium
  ) as ReadingType[];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading notification settings...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Notification Settings</h1>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Configure when you want to receive notifications for different sensor readings. 
            Set minimum and maximum thresholds to get alerted when values go outside your desired range.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="free" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="free" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Basic Readings
            </TabsTrigger>
            <TabsTrigger value="premium" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Premium Readings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="free" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Basic Sensor Notifications
                </CardTitle>
                <CardDescription>
                  Configure notifications for basic sensor readings available to all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {freeReadings.map((readingType) => (
                  <NotificationSettingRow
                    key={readingType}
                    readingType={readingType}
                    setting={getSetting(readingType)}
                    isPremium={isPremium}
                    onUpdate={handleUpdateSetting}
                    isUpdating={upsertSetting.isPending}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="premium" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Premium Sensor Notifications
                </CardTitle>
                <CardDescription>
                  Advanced sensor readings and notifications available with premium subscription.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isPremium && (
                  <div className="mb-6">
                    <UpgradePrompt 
                      title="Unlock Premium Notifications"
                      description="Get notifications for advanced sensor readings including VPD, PAR, UV index, soil moisture, and more."
                      compact={false}
                    />
                    <Separator className="my-4" />
                  </div>
                )}
                
                {premiumReadings.map((readingType) => (
                  <NotificationSettingRow
                    key={readingType}
                    readingType={readingType}
                    setting={getSetting(readingType)}
                    isPremium={isPremium}
                    onUpdate={handleUpdateSetting}
                    isUpdating={upsertSetting.isPending}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>How Notifications Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              • <strong>Toggle notifications</strong> on/off for each sensor reading type
            </p>
            <p>
              • <strong>Set thresholds</strong> to get alerted when values go below minimum or above maximum
            </p>
            <p>
              • <strong>Leave thresholds empty</strong> to get notifications for any reading changes
            </p>
            <p>
              • <strong>Premium readings</strong> require an active premium subscription
            </p>
            <p>
              • Notifications are delivered via email and in-app alerts
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NotificationSettings;
