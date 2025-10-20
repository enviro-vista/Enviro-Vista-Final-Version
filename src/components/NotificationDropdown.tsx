import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MoreHorizontal, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  formatNotificationTime,
  getNotificationIcon,
} from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: any;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem = ({ notification, onMarkRead, onDelete }: NotificationItemProps) => {
  const [showActions, setShowActions] = useState(false);

  const handleMarkRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={`group relative p-3 hover:bg-muted/50 transition-colors ${
        !notification.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.reading_type, notification.threshold_type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
              
              {notification.devices && (
                <p className="text-xs text-primary mt-1">
                  Device: {notification.devices.name}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatNotificationTime(notification.created_at)}
              </span>
              
              {!notification.is_read && (
                <div className="w-2 h-2 bg-primary rounded-full ml-1" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-md border p-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMarkRead}
            className="h-6 w-6 p-0"
            title={notification.is_read ? 'Mark as unread' : 'Mark as read'}
          >
            {notification.is_read ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            title="Delete notification"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications(10);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const handleMarkRead = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification.mutate(notificationId);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={5}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 px-2 text-xs"
                disabled={markAllAsRead.isPending}
              >
                Mark all read
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/notifications">View all notifications</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/notifications/settings">Notification settings</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see notifications here when your sensors trigger alerts
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                <Link to="/notifications">
                  View all notifications
                </Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
