import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Home,
  CreditCard,
  User,
  Shield,
  Settings,
  LogOut,
  CloudRain,
  Bell,
  BarChart3,
  Activity,
  Users,
  Database,
  DollarSign,
} from 'lucide-react';

interface AppSidebarProps {
  variant?: 'sidebar' | 'floating' | 'inset';
}

export function AppSidebar({ variant = 'sidebar' }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const { isPremium } = useSubscriptionStatus();
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (!error) {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out" });
  };

  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isCurrentPage = (path: string) => location.pathname === path;

  // Main navigation items
  const mainNavigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      description: 'Overview and metrics'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      description: 'Data analysis and charts'
    },
    {
      name: 'Devices',
      href: '/devices',
      icon: Activity,
      description: 'Manage your sensors'
    },
  ];

  // Account navigation items
  const accountNavigation = [
    {
      name: 'Subscription',
      href: '/subscription',
      icon: CreditCard,
      description: 'Manage your plan'
    },
    {
      name: 'Billing',
      href: '/billing',
      icon: User,
      description: 'Payment and invoices'
    },
  ];

  // Admin navigation items
  const adminNavigation = [
    {
      name: 'Admin Dashboard',
      href: '/admin',
      icon: Shield,
      description: 'Administrative controls'
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
      description: 'Manage platform users'
    },
    {
      name: 'System',
      href: '/admin/system',
      icon: Database,
      description: 'System settings'
    },
    {
      name: 'Revenue',
      href: '/admin/revenue',
      icon: DollarSign,
      description: 'Financial overview'
    },
  ];

  return (
    <Sidebar variant={variant} className="border-r">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <CloudRain className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Enviro-Vista</span>
            <span className="text-xs text-muted-foreground">Environmental Monitoring</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Info */}
        <SidebarGroup>
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/20">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isPremium ? 'default' : 'secondary'} className="text-xs">
                  {isPremium ? 'Premium' : 'Free'}
                </Badge>
                {isAdmin && (
                  <Badge variant="outline" className="text-xs">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isCurrentPage(item.href)}
                    tooltip={item.description}
                  >
                    <Link to={item.href} onClick={handleNavigate}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Account Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNavigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isCurrentPage(item.href)}
                    tooltip={item.description}
                  >
                    <Link to={item.href} onClick={handleNavigate}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isCurrentPage(item.href)}
                        tooltip={item.description}
                      >
                        <Link to={item.href}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {/* Quick Actions */}
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-sidebar-foreground/70">Theme</span>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Notifications">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut}
              tooltip="Sign out"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
