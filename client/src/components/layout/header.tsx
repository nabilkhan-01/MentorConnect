import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, Loader2, Menu, X, Trash2, Sun, Moon } from "lucide-react";
import { UserRole } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
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

export function Header({ onMenuToggle, sidebarOpen }: { onMenuToggle?: () => void, sidebarOpen?: boolean }) {
  const { user, logoutMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [location, setLocation] = useLocation();

  // Fetch notifications
  const { data: notifications, isLoading: loadingNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    // If API not implemented yet, default to empty array
    // This is a temporary fallback for development
    placeholderData: []
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
    },
    onError: (error: any) => {
      console.error('Error deleting notification:', error);
    },
  });

  if (!user) return null;

  // Filter notifications based on user role and context
  const userRole = user.role;
  const filteredNotifications = notifications?.filter(notification => {
    // For mentors, filter to only show notifications relevant to their mentees
    if (userRole === 'mentor') {
      const menteeKeywords = ['mentee', 'student', 'attendance', 'academic', 'assignment', 'group chat'];
      const message = notification.message.toLowerCase();
      
      // Show notifications that contain mentee-related keywords
      return menteeKeywords.some(keyword => message.includes(keyword));
    }
    
    // For admins, show all notifications
    if (userRole === 'admin') {
      return true;
    }
    
    // For mentees, show mentee-specific notifications
    if (userRole === 'mentee') {
      const menteeKeywords = ['mentee', 'student', 'attendance', 'academic', 'assignment', 'group chat'];
      const message = notification.message.toLowerCase();
      
      // Show notifications that contain mentee-related keywords
      return menteeKeywords.some(keyword => message.includes(keyword));
    }

    return true;
  }) || [];
  
  const unreadCount = filteredNotifications.filter(notification => !notification.isRead).length;
  const urgentCount = filteredNotifications.filter(notification => notification.isUrgent && !notification.isRead).length;

  const userInitials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : user.username.substring(0, 2).toUpperCase();

  return (
    <header className="bg-card elevated z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button 
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-primary mr-2"
              onClick={onMenuToggle}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-xl font-bold text-primary">MentorConnect</h1>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="mr-2"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {/* Notifications Dropdown */}
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative mr-2">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-4 py-2 border-b border-border">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto no-scrollbar">
                  {loadingNotifications ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="px-4 py-3 text-center text-muted-foreground text-sm">
                      No notifications
                    </div>
                  ) : (
                    filteredNotifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-muted ${notification.isUrgent ? 'border-l-4 border-accent' : ''} ${
                          notification.isRead ? 'opacity-70' : 'font-medium'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div 
                            onClick={async () => {
                              // Mark as read when clicked
                              if (!notification.isRead) {
                                try {
                                  await apiRequest("POST", `/api/notifications/${notification.id}/read`);
                                  // Invalidate the notifications query to refresh the data
                                  queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
                                } catch (err) {
                                  console.error('Error marking notification as read:', err);
                                }
                              }
                            }}
                            className="cursor-pointer flex-1"
                          >
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {new Date(notification.createdAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            disabled={deleteNotificationMutation.isPending}
                            className="ml-2 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete notification"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <Link 
                    href={
                      user.role === 'mentor' ? "/mentor/notifications" : 
                      user.role === 'mentee' ? "/mentee/notifications" : 
                      "/notifications"
                    } 
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    View all notifications
                  </Link>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown */}
            <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground hidden md:block">
                    {user.name || user.username}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground/70 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Your Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => logoutMutation.mutate()}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
