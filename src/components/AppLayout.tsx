import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ title: string; href?: string }>;
}

export function AppLayout({ children, title, subtitle, breadcrumbs }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Check if user profile is deleted
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user || isCheckingStatus) return;

      setIsCheckingStatus(true);

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', user.id)
          .single();

        if (error) {
          // If status column doesn't exist yet, ignore the check
          console.log('Status column not available yet, skipping deleted user check');
          return;
        }

        if (profile && 'status' in profile && profile.status === 'deleted') {
          // Show notification
          toast({
            title: "Account Deactivated",
            description: "Your account has been deactivated. Please contact support for assistance.",
            variant: "destructive",
          });

          // Sign out the user
          await signOut();
          
          // Redirect to login page
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    // Only check if user exists
    if (user) {
      // Initial check
      checkUserStatus();

      // Set up periodic check every 5 minutes
      const interval = setInterval(checkUserStatus, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user, signOut, toast, navigate]); // Removed isCheckingStatus from dependencies

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header with breadcrumbs and trigger */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={index}>
                    <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          
          {(title || subtitle) && (
            <div className="ml-auto hidden sm:block">
              {title && <h1 className="text-lg font-semibold">{title}</h1>}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          
          {/* Status check indicator */}
          {isCheckingStatus && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking account status...</span>
            </div>
          )}
        </header>
        
        {/* Main content */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
