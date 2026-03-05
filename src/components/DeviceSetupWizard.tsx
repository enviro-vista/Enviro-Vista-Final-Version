import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ChevronRight, ScanLine, Settings, Bell } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DeviceSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const wizardSteps = [
  {
    id: 'scan-device',
    title: 'Scan or Enter Device ID',
    description: 'Use the QR code scanner or manually enter your device ID (MAC address)',
    icon: ScanLine,
    action: 'add-device',
  },
  {
    id: 'configure-device',
    title: 'Configure Device Settings',
    description: 'Set device name, type (Air/Soil), and optional crop type',
    icon: Settings,
    action: 'configure',
  },
  {
    id: 'setup-notifications',
    title: 'Set Up Notifications',
    description: 'Configure alerts for temperature, humidity, and other sensor readings',
    icon: Bell,
    action: 'notifications',
  },
];

const DeviceSetupWizard = ({ open, onOpenChange }: DeviceSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { completeChecklistItem } = useOnboarding();

  const progress = ((completedSteps.size + 1) / wizardSteps.length) * 100;

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId));
    
    if (stepId === 'scan-device') {
      completeChecklistItem('add-device');
    }
    
    if (currentStep < wizardSteps.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 500);
    } else {
      // All steps completed
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    }
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'add-device':
        // The AddDeviceDialog will be opened by the parent
        break;
      case 'configure':
        navigate('/devices');
        break;
      case 'notifications':
        navigate('/notifications/settings');
        handleStepComplete('setup-notifications');
        break;
    }
  };

  const currentStepData = wizardSteps[currentStep];
  const CurrentIcon = currentStepData.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Device Setup Wizard</DialogTitle>
          <DialogDescription>
            Follow these steps to set up your first environmental sensor device
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">
                Step {currentStep + 1} of {wizardSteps.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps List */}
          <div className="space-y-3">
            {wizardSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = index === currentStep;
              const isPast = index < currentStep;

              return (
                <Card
                  key={step.id}
                  className={cn(
                    "transition-all",
                    isCurrent && "border-primary shadow-md",
                    isCompleted && "bg-muted/50"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : isCurrent ? (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <StepIcon className="h-4 w-4 text-primary-foreground" />
                          </div>
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className={cn(
                            "font-semibold",
                            isCompleted && "line-through text-muted-foreground"
                          )}>
                            {step.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                        {isCurrent && !isCompleted && (
                          <Button
                            size="sm"
                            onClick={() => handleAction(step.action)}
                            className="mt-2"
                          >
                            {step.action === 'add-device' ? 'Open Add Device' : 'Continue'}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Skip Setup
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Previous
                </Button>
              )}
              {completedSteps.size === wizardSteps.length && (
                <Button onClick={() => onOpenChange(false)}>
                  Finish Setup
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceSetupWizard;
