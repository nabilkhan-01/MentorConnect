import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, Menu, X } from "lucide-react";

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logoutMutation } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [location, setLocation] = useLocation();

  if (!user) return null;

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
              <Menu size={24} />
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
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-4 py-2 border-b border-neutral-100">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto no-scrollbar">
                  <div className="px-4 py-3 hover:bg-neutral-50 border-l-4 border-accent">
                    <p className="text-sm text-neutral-500">5 students have attendance below 85%</p>
                    <p className="text-xs text-neutral-400 mt-1">2 hours ago</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-neutral-50">
                    <p className="text-sm text-neutral-500">New student data uploaded successfully</p>
                    <p className="text-xs text-neutral-400 mt-1">Yesterday</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-neutral-100">
                  <Link href="#notifications" className="text-xs text-primary hover:text-primary/80">
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
