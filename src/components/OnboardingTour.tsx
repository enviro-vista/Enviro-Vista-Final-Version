import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLTIP_OFFSET = 16;
const SCROLL_DELAY_MS = 450;

function getTargetElement(step: { target: string }): Element | null {
  if (step.target === 'body') return document.body;
  return document.querySelector(step.target);
}

function measureAndUpdate(
  targetElement: Element,
  highlightRef: React.RefObject<HTMLDivElement | null>,
  setElementRect: (r: DOMRect | null) => void
) {
  const rect = targetElement.getBoundingClientRect();
  setElementRect(rect);
  if (targetElement !== document.body && highlightRef.current) {
    highlightRef.current.style.width = `${Math.max(rect.width, 50)}px`;
    highlightRef.current.style.height = `${Math.max(rect.height, 50)}px`;
    // Fixed positioning uses viewport coordinates (getBoundingClientRect is viewport-relative)
    highlightRef.current.style.top = `${rect.top}px`;
    highlightRef.current.style.left = `${rect.left}px`;
  }
}

const OnboardingTour = () => {
  const {
    isTourActive,
    currentStep,
    steps,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
  } = useOnboarding();

  const overlayRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!isTourActive || steps.length === 0) return;

    const step = steps[currentStep];
    if (!step) return;

    let cancelled = false;

    const tryMeasure = () => {
      const targetElement = getTargetElement(step);
      if (!targetElement) {
        setElementRect(null);
        return;
      }
      if (targetElement !== document.body) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      const t = setTimeout(() => {
        if (cancelled) return;
        const el = getTargetElement(step);
        if (el) measureAndUpdate(el, highlightRef, setElementRect);
      }, SCROLL_DELAY_MS);
      return () => clearTimeout(t);
    };

    let clearTimer: (() => void) | undefined = tryMeasure();

    if (!getTargetElement(step) && step.target !== 'body') {
      const retryId = window.setInterval(() => {
        if (getTargetElement(step)) {
          window.clearInterval(retryId);
          clearTimer?.();
          clearTimer = tryMeasure();
        }
      }, 80);
      const prevClear = clearTimer;
      clearTimer = () => {
        window.clearInterval(retryId);
        prevClear?.();
      };
    }

    return () => {
      cancelled = true;
      clearTimer?.();
    };
  }, [isTourActive, currentStep, steps]);

  if (!isTourActive || steps.length === 0) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Tooltip position: only center when step explicitly targets body; otherwise anchor to element
  const targetElement = getTargetElement(step);
  const position = step.position || 'bottom';
  const isBodyStep = step.target === 'body';

  const rect = isBodyStep
    ? null
    : (elementRect ?? (targetElement && targetElement !== document.body ? targetElement.getBoundingClientRect() : null));

  let tooltipStyle: React.CSSProperties = {};

  if (isBodyStep || !rect) {
    tooltipStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  } else {
    const gap = TOOLTIP_OFFSET;
    const tooltipW = 400;
    const tooltipH = 280;

    switch (position) {
      case 'top':
        tooltipStyle = {
          bottom: `${window.innerHeight - rect.top + gap}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
        break;
      case 'bottom':
        tooltipStyle = {
          top: `${rect.bottom + gap}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
        break;
      case 'left':
        tooltipStyle = {
          top: `${rect.top + rect.height / 2}px`,
          right: `${window.innerWidth - rect.left + gap}px`,
          transform: 'translateY(-50%)',
        };
        break;
      case 'right':
        if (rect.right + tooltipW + gap > window.innerWidth) {
          tooltipStyle = {
            top: `${rect.top + rect.height / 2}px`,
            right: `${window.innerWidth - rect.left + gap}px`,
            transform: 'translateY(-50%)',
          };
        } else {
          tooltipStyle = {
            top: `${rect.top + rect.height / 2}px`,
            left: `${rect.right + gap}px`,
            transform: 'translateY(-50%)',
          };
        }
        break;
      case 'center':
        tooltipStyle = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
        break;
      default:
        tooltipStyle = {
          top: `${rect.bottom + gap}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
    }

    // Clamp to viewport
    if (typeof tooltipStyle.top === 'string') {
      const topVal = parseFloat(tooltipStyle.top);
      if (topVal + tooltipH > window.innerHeight - 20) {
        tooltipStyle.top = 'auto';
        tooltipStyle.bottom = `${window.innerHeight - rect.top + gap}px`;
        tooltipStyle.transform = (tooltipStyle.transform as string)?.includes('translateX') ? 'translateX(-50%)' : 'translateY(-50%)';
      }
    }
    if (typeof tooltipStyle.left === 'string') {
      const leftVal = parseFloat(tooltipStyle.left);
      if (leftVal < 20) tooltipStyle.left = '20px';
      if (leftVal + tooltipW > window.innerWidth - 20) {
        tooltipStyle.left = 'auto';
        tooltipStyle.right = '20px';
      }
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-[9998] transition-opacity"
        onClick={skipTour}
      />

      {/* Highlight */}
      {step.target !== 'body' && (
        <div
          ref={highlightRef}
          className="fixed z-[9999] border-4 border-primary rounded-lg shadow-2xl pointer-events-none transition-all"
          style={{
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <Card
        className={cn(
          "fixed z-[10000] w-[90vw] max-w-md shadow-2xl",
          step.position === 'center' && "w-[95vw] max-w-lg"
        )}
        style={tooltipStyle}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={skipTour}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{step.description}</p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousStep}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTour}
              >
                Skip Tour
              </Button>
              <Button
                size="sm"
                onClick={isLastStep ? completeTour : nextStep}
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default OnboardingTour;
