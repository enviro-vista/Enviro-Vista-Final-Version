import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  id: string;
  content: string;
  title?: string;
  children?: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  showIcon?: boolean;
}

export const HelpTooltip = ({
  id,
  content,
  title,
  children,
  side = 'top',
  className,
  showIcon = true,
}: HelpTooltipProps) => {
  const { showTooltip, dismissTooltip } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);

  const shouldShow = showTooltip(id);

  if (!shouldShow && !isOpen) {
    return children ? <>{children}</> : null;
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          {children || (
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-5 w-5 text-muted-foreground hover:text-foreground", className)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs p-4"
          onPointerDownOutside={(e) => {
            // Allow dismissing tooltip
            setIsOpen(false);
            dismissTooltip(id);
          }}
        >
          <div className="space-y-2">
            {title && (
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{title}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => {
                    setIsOpen(false);
                    dismissTooltip(id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{content}</p>
            {shouldShow && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setIsOpen(false);
                  dismissTooltip(id);
                }}
              >
                Don't show again
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HelpTooltip;
