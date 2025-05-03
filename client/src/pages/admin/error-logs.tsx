import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Clock, Search, User, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type ErrorLog = {
  id: number;
  userId: number | null;
  action: string;
  errorMessage: string;
  stackTrace: string | null;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    name: string | null;
  };
};

export default function AdminErrorLogs() {
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Fetch error logs
  const { data: errorLogs, isLoading } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/error-logs"],
  });
  
  // Filter logs based on search
  const filteredLogs = errorLogs?.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.errorMessage.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.username.toLowerCase().includes(search.toLowerCase())
  ) || [];
  
  const viewDetails = (log: ErrorLog) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };
  
  return (
    <DashboardLayout pageTitle="Error Logs" pageDescription="View and manage system error logs">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by action, error message, or user..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Time</TableHead>
                <TableHead className="w-[150px]">Action</TableHead>
                <TableHead>Error Message</TableHead>
                <TableHead className="w-[150px]">User</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      <p className="text-muted-foreground">Loading error logs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatDateTime(log.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                        <span className="truncate">{log.errorMessage}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{log.user.name || log.user.username}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-muted-foreground">System</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => viewDetails(log)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    {search ? "No matching error logs found." : "No error logs found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Error Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              Detailed information about the error
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Time</h3>
                  <p className="font-mono text-sm">{formatDateTime(selectedLog.createdAt)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Action</h3>
                  <p className="text-sm">{selectedLog.action}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">User</h3>
                  <p className="text-sm">
                    {selectedLog.user 
                      ? `${selectedLog.user.name || selectedLog.user.username} (${selectedLog.user.username})`
                      : "System"}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Error ID</h3>
                  <p className="text-sm font-mono">{selectedLog.id}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Error Message</h3>
                <div className="bg-red-50 border border-red-100 rounded-md p-3 text-sm text-red-800">
                  {selectedLog.errorMessage}
                </div>
              </div>
              
              {selectedLog.stackTrace && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Stack Trace</h3>
                  <pre className="bg-neutral-50 border border-neutral-100 rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                    {selectedLog.stackTrace}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
