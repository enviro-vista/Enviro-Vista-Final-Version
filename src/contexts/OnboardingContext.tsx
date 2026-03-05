import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

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

const STORAGE_KEY_PREFIX = 'onboarding_';
const FIRST_TIME_KEY = 'first_time_user';
const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';
const DISMISSED_TOOLTIPS_KEY = 'dismissed_tooltips';

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

  // Load state from localStorage
  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    const firstTime = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}_${FIRST_TIME_KEY}`) === null;
    const completed = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}_${ONBOARDING_COMPLETE_KEY}`) === 'true';
    
    const savedChecklist = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}_checklist`);
    if (savedChecklist) {
      try {
        setChecklist(JSON.parse(savedChecklist));
      } catch (e) {
        console.error('Failed to parse saved checklist:', e);
      }
    }

    const savedDismissed = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}_${DISMISSED_TOOLTIPS_KEY}`);
    if (savedDismissed) {
      try {
        setDismissedTooltips(new Set(JSON.parse(savedDismissed)));
      } catch (e) {
        console.error('Failed to parse dismissed tooltips:', e);
      }
    }

    // Auto-start tour for first-time users
    if (firstTime && !completed) {
      // Delay to ensure page is loaded
      setTimeout(() => {
        startDefaultTour();
      }, 1000);
    }
  }, [user]);

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
  };

  const completeTour = () => {
    setIsTourActive(false);
    setCurrentStep(0);
    if (user) {
      const userId = user.id;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}_${ONBOARDING_COMPLETE_KEY}`, 'true');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}_${FIRST_TIME_KEY}`, 'false');
    }
  };

  const completeChecklistItem = (id: string) => {
    setChecklist(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, completed: true } : item
      );
      
      if (user) {
        const userId = user.id;
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}_checklist`, JSON.stringify(updated));
      }
      
      return updated;
    });
  };

  const resetChecklist = () => {
    setChecklist(defaultChecklist);
    if (user) {
      const userId = user.id;
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}_checklist`);
    }
  };

  const markOnboardingComplete = () => {
    if (user) {
      const userId = user.id;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}_${ONBOARDING_COMPLETE_KEY}`, 'true');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}_${FIRST_TIME_KEY}`, 'false');
    }
  };

  const showTooltip = (id: string): boolean => {
    return !dismissedTooltips.has(id);
  };

  const dismissTooltip = (id: string) => {
    setDismissedTooltips(prev => {
      const updated = new Set(prev);
      updated.add(id);
      
      if (user) {
        const userId = user.id;
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}_${DISMISSED_TOOLTIPS_KEY}`, JSON.stringify(Array.from(updated)));
      }
      
      return updated;
    });
  };

  const isFirstTimeUser = user 
    ? localStorage.getItem(`${STORAGE_KEY_PREFIX}${user.id}_${FIRST_TIME_KEY}`) === null
    : false;

  const hasCompletedOnboarding = user
    ? localStorage.getItem(`${STORAGE_KEY_PREFIX}${user.id}_${ONBOARDING_COMPLETE_KEY}`) === 'true'
    : false;

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
