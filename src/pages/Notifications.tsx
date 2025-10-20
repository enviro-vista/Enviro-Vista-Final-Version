import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Settings, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCheck,
  Loader2,
  Info,
  Plus
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useCreateNotification,
  formatNotificationTime,
  getNotificationIcon,
} from '@/hooks/useNotifications';
import { READING_TYPES } from '@/hooks/useNotificationSettings';

interface NotificationCardProps {
  notification: any;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationCard = ({ notification, onMarkRead, onDelete }: NotificationCardProps) => {
  const handleMarkRead = () => {
    onMarkRead(notification.id);
  };

  const handleDelete = () => {
    onDelete(notification.id);
  };

  const readingTypeInfo = notification.reading_type 
    ? READING_TYPES[notification.reading_type as keyof typeof READING_TYPES]
    : null;

  return (
    <Card className={`transition-all ${!notification.is_read ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="text-2xl flex-shrink-0 mt-1">
            {getNotificationIcon(notification.reading_type, notification.threshold_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1">
                  {notification.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {!notification.is_read && (
                  <Badge variant="secondary" className="text-xs">
                    New
                  </Badge>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleMarkRead}>
                      {notification.is_read ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Mark as unread
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Mark as read
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{formatNotificationTime(notification.created_at)}</span>
              
              {notification.devices && (
                <span className="text-primary">
                  Device: {notification.devices.name}
                </span>
              )}
              
              {readingTypeInfo && (
                <Badge variant="outline" className="text-xs">
                  {readingTypeInfo.label}
                </Badge>
              )}
              
              {notification.reading_value && (
                <span>
                  Value: {notification.reading_value}
                  {readingTypeInfo?.unit && ` ${readingTypeInfo.unit}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Notifications = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [readingTypeFilter, setReadingTypeFilter] = useState<string>('all');

  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const createNotification = useCreateNotification();

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesReadFilter = filterType === 'all' || 
                             (filterType === 'read' && notification.is_read) ||
                             (filterType === 'unread' && !notification.is_read);
    
    const matchesTypeFilter = readingTypeFilter === 'all' || 
                             notification.reading_type === readingTypeFilter;
    
    return matchesSearch && matchesReadFilter && matchesTypeFilter;
  });

  const handleMarkRead = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification.mutate(notificationId);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  // Create a test notification (for development)
  const handleCreateTestNotification = () => {
    createNotification.mutate({
      title: 'Test Notification',
      message: 'This is a test notification to demonstrate the system.',
      reading_type: 'temperature',
      threshold_type: 'max',
      reading_value: 25.5,
    });
  };

  const unreadNotifications = filteredNotifications.filter(n => !n.is_read);
  const readNotifications = filteredNotifications.filter(n => n.is_read);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">
                Manage your sensor alerts and system notifications
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/notifications/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
            
            {process.env.NODE_ENV === 'development' && (
              <Button 
                variant="outline" 
                onClick={handleCreateTestNotification}
                disabled={createNotification.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Test Notification
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{notifications.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-sm font-medium">Unread</span>
              </div>
              <p className="text-2xl font-bold mt-1">{unreadCount}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Read</span>
              </div>
              <p className="text-2xl font-bold mt-1">{notifications.length - unreadCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={readingTypeFilter} onValueChange={setReadingTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(READING_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleMarkAllRead}
                    disabled={markAllAsRead.isPending}
                  >
                    {markAllAsRead.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCheck className="h-4 w-4 mr-2" />
                    )}
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading notifications...</span>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || filterType !== 'all' || readingTypeFilter !== 'all' 
                  ? 'No matching notifications' 
                  : 'No notifications yet'
                }
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== 'all' || readingTypeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'You\'ll see notifications here when your sensors trigger alerts'
                }
              </p>
              {!searchTerm && filterType === 'all' && readingTypeFilter === 'all' && (
                <Button asChild>
                  <Link to="/notifications/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Notifications
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-2">
                All ({filteredNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex items-center gap-2">
                Unread ({unreadNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="read" className="flex items-center gap-2">
                Read ({readNotifications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                />
              ))}
            </TabsContent>

            <TabsContent value="unread" className="space-y-4">
              {unreadNotifications.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No unread notifications. Great job staying on top of your alerts!
                  </AlertDescription>
                </Alert>
              ) : (
                unreadNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="read" className="space-y-4">
              {readNotifications.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No read notifications to show.
                  </AlertDescription>
                </Alert>
              ) : (
                readNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default Notifications;
