import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Bell, BellRing, Check, CheckCheck, Filter, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTheme } from "@/contexts/theme-context";

// Type for notifications
type Notification = {
  id: number;
  message: string;
  createdAt: string;
  isRead: boolean;
  targetRoles: string[];
  isUrgent?: boolean;
};

export default function Notifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  
  // Toggle states for notification types
  const [showAll, setShowAll] = useState(true);
  const [showUnread, setShowUnread] = useState(true);
  const [showUrgent, setShowUrgent] = useState(true);

  // Fetch notifications
  const { data: allNotifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  // The backend already filters notifications by role, so we don't need additional filtering here
  const notifications = allNotifications || [];

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest("POST", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark notification as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!notifications) return;
      
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const promises = unreadNotifications.map(notification => 
        apiRequest("POST", `/api/notifications/${notification.id}/read`)
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark all notifications as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/notifications/${notificationId}`);
        return await response.json();
      } catch (error) {
        console.error('Delete API error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    },
    onError: (error: any) => {
      console.error('Delete notification error:', error);
      toast({
        title: "Failed to delete notification",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Filter and search notifications
  const filteredNotifications = notifications?.filter(notification => {
    // Filter by toggle states
    if (!showAll && !showUnread && !showUrgent) {
      // If all toggles are off, show nothing
      return false;
    }
    
    // Check if notification should be shown based on toggle states
    const isUnread = !notification.isRead;
    const isUrgent = notification.isUrgent;
    
    let shouldShow = false;
    
    if (showAll) shouldShow = true;
    if (showUnread && isUnread) shouldShow = true;
    if (showUrgent && isUrgent) shouldShow = true;
    
    if (!shouldShow) return false;
    
    // Additional filter by status (for backward compatibility)
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'urgent' && !notification.isUrgent) return false;
    
    // Filter by search term
    if (searchTerm && !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  }) || [];

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const urgentCount = notifications?.filter(n => n.isUrgent && !n.isRead).length || 0;

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteNotification = (notification: Notification) => {
    setNotificationToDelete(notification);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (notificationToDelete) {
      deleteNotificationMutation.mutate(notificationToDelete.id);
    }
  };

  if (!user) {
    return (
      <DashboardLayout pageTitle="Notifications" pageDescription="View and manage all your notifications">
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      pageTitle={user.role === 'mentor' ? "Mentee Notifications" : "Notifications"} 
      pageDescription={user.role === 'mentor' ? "View notifications about your mentees and academic activities" : "View and manage all your notifications"}
    >
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            {user.role === 'mentor' && (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  Mentor View
                </Badge>
              </div>
            )}
            <p className="text-muted-foreground">
              {user.role === 'mentor' 
                ? "Stay updated with notifications about your mentees and academic activities"
                : "Stay updated with important announcements and updates"
              }
            </p>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Stats Cards - Toggle Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
              showAll ? 'ring-2 ring-primary bg-primary/5' : 'opacity-50'
            }`}
            onClick={() => {
              setShowAll(!showAll);
              if (!showAll) {
                // If turning on "All", also turn on others for better UX
                setShowUnread(true);
                setShowUrgent(true);
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Notifications</CardTitle>
              <Bell className={`h-4 w-4 transition-colors ${
                showAll ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {showAll ? 'Showing' : 'Hidden'} • Click to toggle
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
              showUnread ? 'ring-2 ring-primary' : 'opacity-50'
            }`}
            onClick={() => setShowUnread(!showUnread)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Unread</CardTitle>
              <BellRing className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{unreadCount}</div>
              <p className="text-xs mt-1 text-muted-foreground">
                {showUnread ? 'Showing' : 'Hidden'} • Click to toggle
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
              showUrgent ? 'ring-2 ring-primary' : 'opacity-50'
            }`}
            onClick={() => setShowUrgent(!showUrgent)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Urgent</CardTitle>
              <BellRing className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{urgentCount}</div>
              <p className="text-xs mt-1 text-muted-foreground">
                {showUrgent ? 'Showing' : 'Hidden'} • Click to toggle
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Toggle Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Toggle Controls</CardTitle>
            <CardDescription>
              Click the ring icons above or use these buttons to show/hide notification types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showAll ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowAll(!showAll);
                  if (!showAll) {
                    setShowUnread(true);
                    setShowUrgent(true);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                {showAll ? 'Hide All' : 'Show All'}
              </Button>
              <Button
                variant={showUnread ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowUnread(!showUnread)}
                className="flex items-center gap-2"
              >
                <BellRing className="h-4 w-4" />
                {showUnread ? 'Hide Unread' : 'Show Unread'}
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={showUrgent ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowUrgent(!showUrgent)}
                className="flex items-center gap-2"
              >
                <BellRing className="h-4 w-4" />
                {showUrgent ? 'Hide Urgent' : 'Show Urgent'}
                {urgentCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                    {urgentCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-notifications"
                name="search-notifications"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filter === 'all' ? 'All Notifications' : 
               filter === 'unread' ? 'Unread Notifications' : 
               'Urgent Notifications'}
            </CardTitle>
            <CardDescription>
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                  <p className="text-muted-foreground">Loading notifications...</p>
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                <p className="text-muted-foreground">
                  {user.role === 'mentor' ? (
                    filter === 'all' ? "You don't have any mentee-related notifications yet." :
                    filter === 'unread' ? "All mentee notifications have been read." :
                    "No urgent mentee notifications at the moment."
                  ) : (
                    filter === 'all' ? "You don't have any notifications yet." :
                    filter === 'unread' ? "All notifications have been read." :
                    "No urgent notifications at the moment."
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div 
                      className="p-4 rounded-lg border bg-card text-card-foreground"
                    >
                        <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {notification.isUrgent && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                            {notification.isRead ? (
                              <Badge variant="secondary" className="text-xs">
                                Read
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          
                          <p 
                            className={`text-sm font-medium ${
                              notification.isRead 
                                ? 'text-muted-foreground' 
                                : 'text-foreground'
                            }`}
                          >
                            {notification.message}
                          </p>
                          
                          {/* Timestamp removed as requested */}
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsReadMutation.isPending}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification)}
                            disabled={deleteNotificationMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {index < filteredNotifications.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
              {notificationToDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  "{notificationToDelete.message}"
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNotificationMutation.isPending}
            >
              {deleteNotificationMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
