import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, X, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStartChecklistProps {
  compact?: boolean;
  onDismiss?: () => void;
}

const QuickStartChecklist = ({ compact = false, onDismiss }: QuickStartChecklistProps) => {
  const { checklist, completeChecklistItem, isFirstTimeUser, hasCompletedOnboarding } = useOnboarding();
  const navigate = useNavigate();

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progress = (completedCount / totalCount) * 100;

  // Don't show if onboarding is complete and user dismissed it
  if (hasCompletedOnboarding && !isFirstTimeUser) {
    return null;
  }

  const handleItemClick = (item: typeof checklist[0]) => {
    if (!item.completed) {
      completeChecklistItem(item.id);
      if (item.route) {
        navigate(item.route);
      }
    }
  };

  if (compact) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Quick Start</span>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            {completedCount} of {totalCount} tasks completed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Quick Start Checklist
            </CardTitle>
            <CardDescription className="mt-1">
              Complete these steps to get the most out of Enviro-Vista
            </CardDescription>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{completedCount} / {totalCount}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                item.completed
                  ? "bg-muted/50 border-muted"
                  : "bg-background border-border hover:bg-muted/30"
              )}
              onClick={() => handleItemClick(item)}
            >
              <div className="flex-shrink-0">
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    item.completed && "line-through text-muted-foreground"
                  )}
                >
                  {item.label}
                </p>
              </div>
              {item.route && !item.completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(item.route!);
                  }}
                >
                  Go →
                </Button>
              )}
            </div>
          ))}
        </div>

        {completedCount === totalCount && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 text-center">
              🎉 Congratulations! You've completed the quick start guide!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickStartChecklist;
