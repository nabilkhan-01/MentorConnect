import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ExcelUpload from "@/components/excel/excel-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowDown, ArrowUp, BarChart3, Download, FileText, PersonStanding, Users, UserRound, UsersRound, CircleAlert } from "lucide-react";
import { useState } from "react";

type DashboardStats = {
  totalStudents: number;
  totalMentors: number;
  avgMenteesPerMentor: number;
  atRiskStudents: number;
  studentGrowth: number;
  mentorGrowth: number;
};

type AtRiskStudent = {
  id: number;
  name: string;
  usn: string;
  attendance: number;
  mentorName: string;
};

type Activity = {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  icon: string;
};

export default function AdminDashboard() {
  const { toast } = useToast();
  
  // Fetch dashboard stats
  const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });
  
  // Fetch at-risk students
  const { data: atRiskStudents, isLoading: isAtRiskLoading } = useQuery<AtRiskStudent[]>({
    queryKey: ["/api/admin/at-risk-students"],
  });
  
  // Fetch recent activities
  const { data: activities, isLoading: isActivitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/admin/activities"],
  });

  // Handle Excel upload
  const handleExcelUpload = async (file: File, assignmentMethod: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignmentMethod', assignmentMethod);
    
    try {
      await fetch('/api/admin/upload-students', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      toast({
        title: "Upload successful",
        description: "Student data has been uploaded and assigned successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload.",
        variant: "destructive",
      });
    }
  };

  // Handle Export
  const handleExport = async () => {
    try {
      toast({
        title: "Export initiated",
        description: "Preparing data export...",
      });
      
      // Get the data to export
      const [studentsRes, mentorsRes] = await Promise.all([
        fetch('/api/admin/students', { credentials: 'include' }),
        fetch('/api/mentors', { credentials: 'include' })
      ]);
      
      if (!studentsRes.ok || !mentorsRes.ok) {
        throw new Error('Failed to fetch data for export');
      }
      
      const students = await studentsRes.json();
      const mentors = await mentorsRes.json();
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Add students worksheet
      const studentsWS = XLSX.utils.json_to_sheet(students.map((student: any) => ({
        USN: student.usn,
        Name: student.name || '',
        Email: student.email || '',
        Semester: student.semester,
        Section: student.section,
        Mentor: student.mentorName || '',
        'Mobile Number': student.mobileNumber || '',
        'Parent Mobile': student.parentMobileNumber || '',
        Attendance: student.attendance ? `${student.attendance.toFixed(1)}%` : 'N/A'
      })));
      XLSX.utils.book_append_sheet(workbook, studentsWS, "Students");
      
      // Add mentors worksheet
      const mentorsWS = XLSX.utils.json_to_sheet(mentors.map((mentor: any) => ({
        Name: mentor.name || '',
        Email: mentor.email || '',
        Department: mentor.department || '',
        Specialization: mentor.specialization || '',
        'Mobile Number': mentor.mobileNumber || '',
        'Mentee Count': mentor.menteeCount || 0,
        Status: mentor.isActive ? 'Active' : 'Inactive'
      })));
      XLSX.utils.book_append_sheet(workbook, mentorsWS, "Mentors");
      
      // Generate Excel file and trigger download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MentorConnect_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export complete",
        description: "Data has been exported successfully.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export data.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout 
      pageTitle="Admin Dashboard" 
      pageDescription="Overview of the mentor-mentee system"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div></div> {/* Empty div to maintain spacing with flex-between */}
        <div className="mt-4 md:mt-0 space-x-3">
          <ExcelUpload 
            onUpload={handleExcelUpload} 
            buttonText="Upload Student Data"
          />
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Students Card */}
        <StatCard 
          icon={<Users className="h-5 w-5" />}
          title="Total Students"
          value={isStatsLoading ? "Loading..." : stats?.totalStudents.toString() || "0"}
          change={isStatsLoading ? undefined : stats?.studentGrowth || 0}
          changeLabel="vs previous semester"
          iconColor="bg-primary-100 text-primary"
        />
        
        {/* Total Mentors Card */}
        <StatCard 
          icon={<UsersRound className="h-5 w-5" />}
          title="Total Mentors"
          value={isStatsLoading ? "Loading..." : stats?.totalMentors.toString() || "0"}
          change={isStatsLoading ? undefined : stats?.mentorGrowth || 0}
          changeLabel="vs previous semester"
          iconColor="bg-secondary-100 text-secondary"
        />
        
        {/* Average Mentee per Mentor */}
        <StatCard 
          icon={<UserRound className="h-5 w-5" />}
          title="Avg. Mentees/Mentor"
          value={isStatsLoading ? "Loading..." : (stats?.avgMenteesPerMentor.toFixed(1) || "0")}
          note="Ideal range: 10-15"
          iconColor="bg-primary-100 text-primary"
        />
        
        {/* At Risk Students */}
        <StatCard 
          icon={<CircleAlert className="h-5 w-5" />}
          title="At-Risk Students"
          value={isStatsLoading ? "Loading..." : stats?.atRiskStudents.toString() || "0"}
          change={12.8}
          changeLabel="vs previous semester"
          iconColor="bg-accent bg-opacity-20 text-accent"
          negative
        />
      </div>
      
      {/* At-Risk Students & Recent Activities Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* At-Risk Students Section */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-4 py-3 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="font-semibold text-neutral-800">At-Risk Students</h2>
              <Button variant="link" size="sm" className="text-primary" onClick={() => window.location.href = "/admin/students"}>View All</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Mentor</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAtRiskLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        <div className="flex flex-col items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading students...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : atRiskStudents && atRiskStudents.length > 0 ? (
                    atRiskStudents.slice(0, 5).map((student) => (
                      <TableRow key={student.id} className="hover:bg-neutral-50">
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.usn}</TableCell>
                        <TableCell>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            {student.attendance.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>{student.mentorName}</TableCell>
                        <TableCell>
                          <Button variant="link" size="sm" className="text-primary p-0">View</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No at-risk students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {atRiskStudents && atRiskStudents.length > 0 && (
              <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100 text-xs text-neutral-500">
                Showing {Math.min(5, atRiskStudents.length)} of {atRiskStudents.length} at-risk students
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <div className="px-4 py-3 border-b border-neutral-100">
              <h2 className="font-semibold text-neutral-800">Recent Activities</h2>
            </div>
            <div className="overflow-y-auto max-h-[350px]">
              <ul className="divide-y divide-neutral-100">
                {isActivitiesLoading ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading activities...</p>
                  </div>
                ) : activities && activities.length > 0 ? (
                  activities.map((activity) => (
                    <li key={activity.id} className="px-4 py-3">
                      <div className="flex">
                        <div className="flex-shrink-0 mr-3">
                          <ActivityIcon type={activity.type} />
                        </div>
                        <div>
                          <p className="text-sm text-neutral-800">{activity.description}</p>
                          <p className="text-xs text-neutral-500 mt-1">{formatDateTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-6 text-center text-muted-foreground">
                    No recent activities
                  </li>
                )}
              </ul>
            </div>
            <div className="px-4 py-3 border-t border-neutral-100">
              <Button variant="link" size="sm" className="text-primary p-0" onClick={() => window.location.href = "/admin/error-logs"}>View All Activities</Button>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Mentor Distribution & System Stats Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Mentor Distribution Card */}
        <Card className="lg:col-span-2">
          <div className="px-4 py-3 border-b border-neutral-100">
            <h2 className="font-semibold text-neutral-800">Mentor-Mentee Distribution</h2>
          </div>
          <div className="p-4">
            <div className="h-64 flex items-center justify-center bg-neutral-50 rounded">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-neutral-300" />
                <p className="text-neutral-500 text-sm mt-2">Mentor-Mentee Distribution Chart</p>
              </div>
            </div>
          </div>
        </Card>

        {/* System Status Card */}
        <Card>
          <div className="px-4 py-3 border-b border-neutral-100">
            <h2 className="font-semibold text-neutral-800">System Status</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="text-sm text-neutral-600">Last Backup</div>
                <div className="text-sm font-medium text-neutral-800">Today, 03:00 AM</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-neutral-600">Error Logs</div>
                <div className="flex items-center">
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-800 bg-red-100 rounded-full mr-2">3</span>
                  <Button variant="link" size="sm" className="text-primary p-0 h-auto">View</Button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-neutral-600">Server Status</div>
                <div className="flex items-center">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-neutral-600">Database Usage</div>
                <div className="text-sm font-medium text-neutral-800">52% (13.2 GB)</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <Button variant="link" size="sm" className="text-primary p-0 flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                System Settings
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Utility Components

type StatCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  note?: string;
  iconColor: string;
  negative?: boolean;
};

function StatCard({ icon, title, value, change, changeLabel, note, iconColor, negative = false }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center">
        <div className={`rounded-full ${iconColor} p-3 mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="text-2xl font-bold text-neutral-800">{value}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center">
        {change !== undefined && (
          <>
            <span className={`text-xs flex items-center ${negative ? 'text-red-600' : 'text-green-600'}`}>
              {change > 0 ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
            {changeLabel && <span className="text-xs text-neutral-500 ml-2">{changeLabel}</span>}
          </>
        )}
        {note && <span className="text-xs text-neutral-500">{note}</span>}
      </div>
    </Card>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    'upload': <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center"><FileText className="h-4 w-4 text-primary" /></div>,
    'add': <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center"><PersonStanding className="h-4 w-4 text-green-600" /></div>,
    'warning': <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center"><CircleAlert className="h-4 w-4 text-amber-600" /></div>,
    'transfer': <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center"><ArrowUp className="h-4 w-4 text-primary" /></div>,
    'delete': <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center"><FileText className="h-4 w-4 text-neutral-600" /></div>,
  };
  
  return iconMap[type] || <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center"><FileText className="h-4 w-4 text-neutral-600" /></div>;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffInDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
      `, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}
