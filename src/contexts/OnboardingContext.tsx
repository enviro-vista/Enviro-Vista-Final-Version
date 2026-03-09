import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or element ID
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform when step is shown
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  route?: string; // Optional route to navigate to complete this item
}

interface OnboardingContextType {
  // Tour state
  isTourActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startTour: (steps?: OnboardingStep[]) => void;
  startSidebarTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  
  // Checklist state
  checklist: ChecklistItem[];
  completeChecklistItem: (id: string) => void;
  resetChecklist: () => void;
  
  // First-time user detection
  isFirstTimeUser: boolean;
  hasCompletedOnboarding: boolean;
  markOnboardingComplete: () => void;
  
  // Tooltips
  showTooltip: (id: string) => boolean;
  dismissTooltip: (id: string) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_TABLE = 'user_onboarding';

const defaultChecklist: ChecklistItem[] = [
  {
    id: 'add-device',
    label: 'Add your first device',
    completed: false,
    route: '/devices'
  },
  {
    id: 'view-dashboard',
    label: 'Explore the dashboard',
    completed: false,
    route: '/'
  },
  {
    id: 'configure-notifications',
    label: 'Set up notifications',
    completed: false,
    route: '/notifications/settings'
  },
  {
    id: 'view-charts',
    label: 'View data charts',
    completed: false,
    route: '/'
  },
  {
    id: 'explore-ai',
    label: 'Try the AI assistant',
    completed: false,
    route: '/'
  }
];

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(new Set());
  const [tourDismissed, setTourDismissed] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);

  // Persist to Supabase (upsert user_onboarding)
  const upsertOnboarding = useCallback(
    async (updates: { checklist?: ChecklistItem[]; tour_dismissed?: boolean; dismissed_tooltips?: string[] }) => {
      if (!user) return;
      const payload = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
        ...(updates.checklist !== undefined && { checklist: JSON.parse(JSON.stringify(updates.checklist)) }),
        ...(updates.tour_dismissed !== undefined && { tour_dismissed: updates.tour_dismissed }),
        ...(updates.dismissed_tooltips !== undefined && { dismissed_tooltips: updates.dismissed_tooltips }),
      };
      await supabase.from(ONBOARDING_TABLE).upsert(payload, {
        onConflict: 'user_id',
      });
    },
    [user]
  );

  // Load state from Supabase
  useEffect(() => {
    if (!user) {
      setOnboardingLoaded(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from(ONBOARDING_TABLE)
        .select('checklist, tour_dismissed, dismissed_tooltips')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Failed to load onboarding state:', error);
        setOnboardingLoaded(true);
        return;
      }

      if (data) {
        if (Array.isArray(data.checklist) && data.checklist.length > 0) {
          const saved = data.checklist as unknown as ChecklistItem[];
          const merged = defaultChecklist.map(
            (d) => saved.find((s) => s.id === d.id) ?? d
          );
          setChecklist(merged);
        }
        if (data.tour_dismissed === true) {
          setTourDismissed(true);
        }
        if (Array.isArray(data.dismissed_tooltips)) {
          setDismissedTooltips(new Set(data.dismissed_tooltips as string[]));
        }
      }
      setOnboardingLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-start tour only for first-time users who haven't dismissed/skipped (after load from Supabase)
  useEffect(() => {
    if (!user || !onboardingLoaded || tourDismissed) return;
    const timer = setTimeout(() => {
      startDefaultTour();
    }, 1000);
    return () => clearTimeout(timer);
  }, [user, onboardingLoaded, tourDismissed]);

  const startDefaultTour = () => {
    const defaultSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to Enviro-Vista! 👋',
        description: 'Let\'s take a quick tour to help you get started with monitoring your environmental sensors.',
        target: 'body',
        position: 'center'
      },
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        description: 'Your dashboard shows real-time metrics from all your devices. You can see temperature, humidity, pressure, and more.',
        target: '[data-onboarding="dashboard-overview"]',
        position: 'bottom'
      },
      {
        id: 'devices-grid',
        title: 'Your Devices',
        description: 'Here you can see all your registered devices. Click on any device to view detailed readings and charts.',
        target: '[data-onboarding="devices-grid"]',
        position: 'top'
      },
      {
        id: 'add-device-button',
        title: 'Add a Device',
        description: 'Click here to add a new device. You\'ll need the device ID or QR code from your sensor.',
        target: '[data-onboarding="add-device"]',
        position: 'bottom'
      },
      {
        id: 'ai-assistant',
        title: 'AI Assistant',
        description: 'Get personalized insights and recommendations from our AI assistant based on your sensor data.',
        target: '[data-onboarding="ai-chat"]',
        position: 'center'
      },
      {
        id: 'navigation',
        title: 'Navigation',
        description: 'Use the sidebar to navigate between devices, notifications, settings, and more.',
        target: '[data-onboarding="sidebar"]',
        position: 'right'
      }
    ];
    startTour(defaultSteps);
  };

  const startSidebarTour = () => {
    const sidebarSteps: OnboardingStep[] = [
      {
        id: 'sidebar-intro',
        title: 'Navigation Sidebar',
        description: 'Let\'s explore the navigation sidebar. This is your main way to access all features of Enviro-Vista.',
        target: '[data-onboarding="sidebar"]',
        position: 'right'
      },
      {
        id: 'sidebar-dashboard',
        title: 'Dashboard',
        description: 'The Dashboard is your home page. Here you\'ll see an overview of all your devices, real-time metrics, and quick access to your most important data.',
        target: '[data-onboarding="sidebar-dashboard"]',
        position: 'right'
      },
      {
        id: 'sidebar-devices',
        title: 'Devices',
        description: 'The Devices page shows all your registered sensors. You can view, manage, and configure each device, see detailed readings, and access historical data.',
        target: '[data-onboarding="sidebar-devices"]',
        position: 'right'
      },
      {
        id: 'sidebar-profile',
        title: 'Profile',
        description: 'Your Profile page contains account settings, security options, and personal information. You can update your email, change your password, and manage your account preferences here.',
        target: '[data-onboarding="sidebar-profile"]',
        position: 'right'
      },
      {
        id: 'sidebar-notifications',
        title: 'Notifications',
        description: 'The Notifications page shows all your alerts and important updates. You\'ll see threshold breaches, device status changes, and system notifications here.',
        target: '[data-onboarding="sidebar-notifications"]',
        position: 'right'
      },
      {
        id: 'sidebar-subscription',
        title: 'Subscription',
        description: 'Manage your subscription plan here. Upgrade to Premium to unlock advanced features like CO₂ monitoring, soil sensors, light sensors, and interactive AI chat.',
        target: '[data-onboarding="sidebar-subscription"]',
        position: 'right'
      },
      {
        id: 'sidebar-billing',
        title: 'Billing',
        description: 'The Billing page shows your payment history, invoices, and payment methods. You can update your payment information and view transaction details here.',
        target: '[data-onboarding="sidebar-billing"]',
        position: 'right'
      },
      {
        id: 'sidebar-notification-settings',
        title: 'Notification Settings',
        description: 'Configure your notification preferences here. Set thresholds for temperature, humidity, and other sensor readings to get alerted when values go outside your desired range.',
        target: '[data-onboarding="sidebar-notifications-settings"]',
        position: 'right'
      },
      {
        id: 'sidebar-settings',
        title: 'Settings',
        description: 'General application settings and preferences. Customize your experience and configure platform-wide options.',
        target: '[data-onboarding="sidebar-settings"]',
        position: 'right'
      },
      {
        id: 'sidebar-complete',
        title: 'Navigation Complete! 🎉',
        description: 'You\'ve learned about all the main navigation options. Feel free to explore each section to get the most out of Enviro-Vista!',
        target: '[data-onboarding="sidebar"]',
        position: 'center'
      }
    ];
    startTour(sidebarSteps);
  };

  const startTour = (customSteps?: OnboardingStep[]) => {
    if (customSteps && customSteps.length > 0) {
      setSteps(customSteps);
    } else {
      startDefaultTour();
      return;
    }
    setIsTourActive(true);
    setCurrentStep(0);
    
    // Scroll to first step target
    setTimeout(() => {
      const firstStep = customSteps?.[0];
      if (firstStep && firstStep.target !== 'body') {
        const element = document.querySelector(firstStep.target);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      
      // Scroll to next step target
      setTimeout(() => {
        const step = steps[nextStepIndex];
        if (step && step.target !== 'body') {
          const element = document.querySelector(step.target);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Execute action if present
          if (step.action) {
            step.action();
          }
        }
      }, 100);
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      
      setTimeout(() => {
        const step = steps[prevStepIndex];
        if (step && step.target !== 'body') {
          const element = document.querySelector(step.target);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const skipTour = () => {
    setIsTourActive(false);
    setCurrentStep(0);
    setTourDismissed(true);
    upsertOnboarding({ tour_dismissed: true });
  };

  const completeTour = () => {
    setIsTourActive(false);
    setCurrentStep(0);
    setTourDismissed(true);
    upsertOnboarding({ tour_dismissed: true });
  };

  const completeChecklistItem = (id: string) => {
    setChecklist(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, completed: true } : item
      );
      upsertOnboarding({ checklist: updated });
      return updated;
    });
  };

  const resetChecklist = () => {
    setChecklist(defaultChecklist);
    upsertOnboarding({ checklist: defaultChecklist });
  };

  const markOnboardingComplete = () => {
    setTourDismissed(true);
    upsertOnboarding({ tour_dismissed: true });
  };

  const showTooltip = (id: string): boolean => {
    return !dismissedTooltips.has(id);
  };

  const dismissTooltip = (id: string) => {
    setDismissedTooltips(prev => {
      const updated = new Set(prev);
      updated.add(id);
      upsertOnboarding({ dismissed_tooltips: Array.from(updated) });
      return updated;
    });
  };

  const isFirstTimeUser = user ? !tourDismissed : false;
  const hasCompletedOnboarding = user ? tourDismissed : false;

  return (
    <OnboardingContext.Provider
      value={{
        isTourActive,
        currentStep,
        steps,
        startTour,
        startSidebarTour,
        nextStep,
        previousStep,
        skipTour,
        completeTour,
        checklist,
        completeChecklistItem,
        resetChecklist,
        isFirstTimeUser,
        hasCompletedOnboarding,
        markOnboardingComplete,
        showTooltip,
        dismissTooltip,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
