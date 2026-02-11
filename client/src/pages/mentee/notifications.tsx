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

// Type for notifications
type Notification = {
  id: number;
  message: string;
  createdAt: string;
  isRead: boolean;
  targetRoles: string[];
  isUrgent?: boolean;
};

export default function MenteeNotificationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
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
    queryKey: ["/api/notifications", user?.id],
    enabled: !!user?.id,
  });

  // The backend already filters notifications by role, so we don't need additional filtering here
  const notifications = allNotifications || [];

  // Calculate stats
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => n.isUrgent && !n.isRead).length;

  // Apply filters
  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchTerm && !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Type filters
    if (!showAll && !showUnread && !showUrgent) {
      return false;
    }

    if (!showAll && notification.isRead) {
      return false;
    }

    if (!showUnread && !notification.isRead) {
      return false;
    }

    if (!showUrgent && notification.isUrgent) {
      return false;
    }

    // Main filter
    if (filter === 'unread' && notification.isRead) {
      return false;
    }

    if (filter === 'urgent' && !notification.isUrgent) {
      return false;
    }

    return true;
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest("POST", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark notification as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(n => 
          apiRequest("POST", `/api/notifications/${n.id}/read`)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "All notifications marked as read",
        description: "All your notifications have been marked as read.",
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
      const response = await apiRequest("DELETE", `/api/notifications/${notificationId}`);
      return response.json();
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
    onError: (error: Error) => {
      toast({
        title: "Failed to delete notification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout 
      pageTitle="My Notifications" 
      pageDescription="Stay updated with your academic notifications and important announcements"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              showAll ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
            onClick={() => {
              setShowAll(!showAll);
              setFilter('all');
            }}
          >
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <Bell className={`h-5 w-5 ${showAll ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              showUnread ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-muted/50'
            }`}
            onClick={() => {
              setShowUnread(!showUnread);
              setFilter('unread');
            }}
          >
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <BellRing className={`h-5 w-5 ${showUnread ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              showUrgent ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-muted/50'
            }`}
            onClick={() => {
              setShowUrgent(!showUrgent);
              setFilter('urgent');
            }}
          >
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <BellRing className={`h-5 w-5 ${showUrgent ? 'text-red-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-2xl font-bold">{urgentCount}</p>
                  <p className="text-sm text-muted-foreground">Urgent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Controls</CardTitle>
            <CardDescription>Manage and filter your notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="search-mentee-notifications"
                name="search-mentee-notifications"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Toggle Controls */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showAll ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                <Bell className="h-4 w-4 mr-2" />
                All ({totalCount})
              </Button>
              <Button
                variant={showUnread ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUnread(!showUnread)}
              >
                <BellRing className="h-4 w-4 mr-2" />
                Unread ({unreadCount})
              </Button>
              <Button
                variant={showUrgent ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUrgent(!showUrgent)}
              >
                <BellRing className="h-4 w-4 mr-2" />
                Urgent ({urgentCount})
              </Button>
            </div>

            {/* Mark All as Read */}
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All as Read
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Notifications</CardTitle>
            <CardDescription>
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="space-y-4">
                {filteredNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div className={`p-4 rounded-lg border transition-all duration-200 ${
                      notification.isRead 
                        ? 'bg-muted/30 border-muted' 
                        : 'bg-background border-border shadow-sm'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {notification.isUrgent && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                            {!notification.isRead && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification)}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification)}
                            disabled={deleteNotificationMutation.isPending}
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications found</p>
                <p className="text-sm">You're all caught up!</p>
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
