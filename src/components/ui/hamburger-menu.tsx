import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSidebar } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Menu, 
  Home, 
  CreditCard, 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Bell,
  CloudRain
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface HamburgerMenuProps {
  isAdmin?: boolean;
}

export function HamburgerMenu({ isAdmin = false }: HamburgerMenuProps) {
  const { signOut, user } = useAuth();
  const { isPremium } = useSubscriptionStatus();
  const location = useLocation();
  
  // Try to use sidebar context if available, fallback to local state
  let sidebarContext = null;
  try {
    sidebarContext = useSidebar();
  } catch {
    // Not in sidebar context, use local state
  }
  
  const [localOpen, setLocalOpen] = useState(false);
  const open = sidebarContext?.openMobile ?? localOpen;
  const setOpen = sidebarContext?.setOpenMobile ?? setLocalOpen;

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out" });
    setOpen(false);
  };

  const isCurrentPage = (path: string) => location.pathname === path;

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      show: true,
    },
    {
      name: 'Subscription',
      href: '/subscription',
      icon: CreditCard,
      show: true,
    },
    {
      name: 'Billing',
      href: '/billing',
      icon: User,
      show: true,
    },
    {
      name: 'Admin',
      href: '/admin',
      icon: Shield,
      show: isAdmin,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <CloudRain className="h-6 w-6 text-primary" />
            <div>
              <div className="font-bold">Enviro-Vista</div>
              <div className="text-xs text-muted-foreground font-normal">Environmental Monitoring</div>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.email}</p>
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

          <Separator />

          {/* Navigation */}
          <nav className="space-y-2">
            {navigation.filter(item => item.show).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrentPage(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          <Separator />

          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium">Theme</span>
            <ThemeToggle />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                // Open settings dialog - you might want to trigger this from parent
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
