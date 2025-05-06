import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { UserRole } from "@shared/schema";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
};

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  if (!user) return null;
  
  const userInitials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : user.username.substring(0, 2).toUpperCase();

  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  return (
    <aside className="bg-white elevated w-64 flex-shrink-0 h-full">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              <span>{userInitials}</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-500">{user.name || user.username}</p>
              <p className="text-xs text-neutral-400">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 py-4">
          <div className="px-2 space-y-1">
            {/* Dashboard Link - shown for all roles */}
            {user.role === UserRole.ADMIN && (
              <NavItem href="/" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>} active={isActive("/")}>
                Dashboard
              </NavItem>
            )}
            
            {user.role === UserRole.MENTOR && (
              <NavItem href="/mentor" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>} active={isActive("/mentor")}>
                Dashboard
              </NavItem>
            )}
            
            {user.role === UserRole.MENTEE && (
              <NavItem href="/mentee" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>} active={isActive("/mentee")}>
                Dashboard
              </NavItem>
            )}
            
            {/* Admin Links */}
            {user.role === UserRole.ADMIN && (
              <>
                <NavItem href="/admin/students" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} active={isActive("/admin/students")}>
                  Students
                </NavItem>
                <NavItem href="/admin/mentors" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} active={isActive("/admin/mentors")}>
                  Mentors
                </NavItem>
                <NavItem href="/admin/subjects" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>} active={isActive("/admin/subjects")}>
                  Subjects
                </NavItem>
                <NavItem href="/admin/data-import" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>} active={isActive("/admin/data-import")}>
                  Data Import
                </NavItem>
                <NavItem href="/admin/error-logs" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} active={isActive("/admin/error-logs")}>
                  Error Logs
                </NavItem>
              </>
            )}
            
            {/* Mentor Links */}
            {user.role === UserRole.MENTOR && (
              <>
                <NavItem href="/mentor/mentees" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} active={isActive("/mentor/mentees")}>
                  My Mentees
                </NavItem>
                <NavItem href="/mentor/at-risk" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} active={isActive("/mentor/at-risk")}>
                  At-Risk Students
                </NavItem>
              </>
            )}
            
            {/* Common User Links */}
            <NavItem href="/notifications" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>} active={isActive("/notifications")}>
              Notifications
            </NavItem>

            {/* Mentee Links */}
            {user.role === UserRole.MENTEE && (
              <>
                <NavItem href="/profile" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} active={isActive("/profile")}>
                  My Profile
                </NavItem>
                <NavItem href="/mentee/academic-progress" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>} active={isActive("/mentee/academic-progress")}>
                  Academic Progress
                </NavItem>
                <NavItem href="/mentee/self-assessment" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-.5a.5.5 0 0 1-.5-.5V2a2 2 0 1 0-4 0v.5a.5.5 0 0 1-.5.5z"/><path d="M8 3a2.5 2.5 0 0 1 4 0"/><path d="M9.5 3h.5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M15 12v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7"/><rect x="13" y="2" width="6" height="10" rx="2"/></svg>} active={isActive("/mentee/self-assessment")}>
                  Self Assessment
                </NavItem>
                <NavItem href="/mentee/messages" icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} active={isActive("/mentee/messages")}>
                  Messages
                </NavItem>
              </>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-neutral-100">
          <button 
            onClick={() => logoutMutation.mutate()}
            className="flex items-center text-sm font-medium text-neutral-500 hover:text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, icon, children, active }: NavItemProps) {
  return (
    <Link href={href} className={cn(
      "flex items-center px-3 py-2 text-sm font-medium rounded-md group transition-colors", 
      active 
        ? "bg-primary-50 text-primary" 
        : "text-neutral-500 hover:bg-neutral-50 hover:text-primary"
    )}>
      {React.cloneElement(icon as React.ReactElement, { 
        className: cn(
          (icon as React.ReactElement).props.className, 
          active ? "text-primary" : "text-neutral-400 group-hover:text-primary"
        ) 
      })}
      {children}
    </Link>
  );
}

export default Sidebar;
