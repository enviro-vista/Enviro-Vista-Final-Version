
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Bell, User, CloudRain, Settings } from "lucide-react";

const Header = () => {
  const { signOut } = useAuth();
  const [liveMonitoring, setLiveMonitoring] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out" });
  };

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CloudRain className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">Climate Pulse</h1>
                <p className="text-xs text-muted-foreground">Environmental Monitoring</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:flex status-online">
              Live Monitoring
            </Badge>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-80">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Notifications</h3>
                  <p className="text-xs text-muted-foreground">You're all caught up. No new alerts.</p>
                </div>
              </PopoverContent>
            </Popover>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>Configure your dashboard preferences.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Live monitoring</p>
                      <p className="text-xs text-muted-foreground">Update dashboard in real time.</p>
                    </div>
                    <Switch checked={liveMonitoring} onCheckedChange={setLiveMonitoring} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Notifications</p>
                      <p className="text-xs text-muted-foreground">Enable alert popovers.</p>
                    </div>
                    <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      try {
                        localStorage.setItem("settings.liveMonitoring", JSON.stringify(liveMonitoring));
                        localStorage.setItem("settings.alertsEnabled", JSON.stringify(alertsEnabled));
                        toast({ title: "Settings saved" });
                      } catch (e) {
                        toast({ title: "Could not save settings" });
                      }
                    }}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="User menu">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
