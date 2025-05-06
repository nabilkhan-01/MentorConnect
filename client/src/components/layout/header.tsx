import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, Loader2, Menu, X } from "lucide-react";
import { UserRole } from "@shared/schema";

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

  if (!user) return null;

  // Filter notifications based on user role
  const userRole = user.role;
  const filteredNotifications = notifications?.filter(notification => 
    notification.targetRoles && (
      notification.targetRoles.includes(userRole) || 
      notification.targetRoles.includes('all')
    )
  ) || [];
  
  const unreadCount = filteredNotifications.filter(notification => !notification.isRead).length;

  const userInitials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : user.username.substring(0, 2).toUpperCase();

  return (
    <header className="bg-white elevated z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button 
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-primary mr-2"
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
                <div className="px-4 py-2 border-b border-neutral-100">
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
                        className={`px-4 py-3 hover:bg-neutral-50 ${notification.isUrgent ? 'border-l-4 border-accent' : ''} ${
                          notification.isRead ? 'opacity-70' : 'font-medium'
                        }`}
                      >
                        <div 
                          onClick={() => {
                            // Mark as read when clicked
                            if (!notification.isRead) {
                              fetch(`/api/notifications/${notification.id}/read`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                }
                              })
                              .then(() => {
                                // Invalidate the notifications query to refresh the data
                                window.location.reload();
                              })
                              .catch(err => console.error('Error marking notification as read:', err));
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <p className="text-sm text-neutral-500">{notification.message}</p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-neutral-100">
                  <Link href="/notifications" className="text-xs text-primary hover:text-primary/80">
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
                  <span className="text-sm text-neutral-500 hidden md:block">
                    {user.name || user.username}
                  </span>
                  <ChevronDown className="h-4 w-4 text-neutral-400 hidden md:block" />
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
