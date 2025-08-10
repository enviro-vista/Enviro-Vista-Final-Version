
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, CloudRain } from "lucide-react";

const Header = () => {
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
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
