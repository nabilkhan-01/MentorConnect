import { useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

type DashboardLayoutProps = {
  children: React.ReactNode;
  pageTitle?: string;
  pageDescription?: string;
};

export function DashboardLayout({
  children,
  pageTitle,
  pageDescription,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <div className="h-screen flex flex-col">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-20 bg-neutral-800 bg-opacity-50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div 
              className="absolute right-0 top-0 h-full w-64 bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar />
            </div>
          </div>
        )}
        
        {/* Mobile menu toggle button */}
        <div className="md:hidden fixed bottom-4 right-4 z-10">
          <button 
            className="h-12 w-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 md:p-6">
          <div className="container mx-auto">
            {pageTitle && (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-800">{pageTitle}</h1>
                  {pageDescription && (
                    <p className="text-sm text-neutral-500 mt-1">{pageDescription}</p>
                  )}
                </div>
                {/* Slot for action buttons - provided via children */}
              </div>
            )}
            
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
