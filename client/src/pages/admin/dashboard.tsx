import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ExcelUpload from "@/components/excel/excel-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowDown, ArrowUp, BarChart3, Download, FileText, PersonStanding, Users, UserRound, UsersRound, CircleAlert, User, Phone, Mail, Calendar, BookOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from "@tanstack/react-query";

type DashboardStats = {
  totalStudents: number;
  totalMentors: number;
  avgMenteesPerMentor: number;
  atRiskStudents: number;
};

type AtRiskStudent = {
  id: number;
  userId: number;
  usn: string;
  mentorId?: number;
  semester: number;
  section: string;
  mobileNumber?: string;
  parentMobileNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  name?: string;
  email?: string;
  attendance?: number;
  mentorName?: string;
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
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false);

  // Handle viewing student details
  const handleViewStudent = (student: AtRiskStudent) => {
    setSelectedStudent(student);
    setIsStudentDetailsOpen(true);
  };
  
  // Fetch dashboard stats
  const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });
  
  // Fetch at-risk students
  const { data: atRiskStudents, isLoading: isAtRiskLoading } = useQuery<AtRiskStudent[]>({
    queryKey: ["/api/admin/at-risk-students"],
  });

  // Cleanup old group messages mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/group-messages/cleanup");
      if (!response.ok) {
        throw new Error("Failed to cleanup messages");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup successful",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cleanup failed",
        description: error.message || "Failed to cleanup old messages",
        variant: "destructive",
      });
    },
  });
  
  // Fetch recent activities
  const { data: activitiesData, isLoading: isActivitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/admin/activities"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data (TanStack Query v5)
  });

  const activities: Activity[] = Array.isArray(activitiesData) ? activitiesData : [];

  // Handle Excel upload
  const handleExcelUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

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
          iconColor="bg-primary-100 text-primary"
        />
        
        {/* Total Mentors Card */}
        <StatCard 
          icon={<UsersRound className="h-5 w-5" />}
          title="Total Mentors"
          value={isStatsLoading ? "Loading..." : stats?.totalMentors.toString() || "0"}
          iconColor="bg-secondary-100 text-secondary"
        />
        
        {/* Average Mentee per Mentor */}
        <StatCard 
          icon={<UserRound className="h-5 w-5" />}
          title="Avg. Mentees/Mentor"
          value={isStatsLoading ? "Loading..." : (stats?.avgMenteesPerMentor.toFixed(1) || "0")}
          iconColor="bg-primary-100 text-primary"
        />
        
        {/* At Risk Students */}
        <StatCard 
          icon={<CircleAlert className="h-5 w-5" />}
          title="At-Risk Students"
          value={isStatsLoading ? "Loading..." : stats?.atRiskStudents.toString() || "0"}
          iconColor="bg-red-100 text-red-600"
          negative
        />
      </div>

      {/* Admin Actions */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Message Cleanup</h3>
                <p className="text-sm text-muted-foreground">
                  Delete group chat messages older than 1 month
                </p>
              </div>
              <Button
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {cleanupMutation.isPending ? "Cleaning..." : "Cleanup Messages"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* At-Risk Students & Recent Activities Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* At-Risk Students Section */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-4 py-3 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold text-foreground">At-Risk Students</h2>
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
                      <TableRow key={student.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.usn}</TableCell>
                        <TableCell>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            {(student.attendance || 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>{student.mentorName || "Not assigned"}</TableCell>
                        <TableCell>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-primary p-0"
                            onClick={() => handleViewStudent(student)}
                          >
                            View
                          </Button>
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
              <div className="px-4 py-3 bg-muted border-t border-border text-xs text-muted-foreground">
                Showing {Math.min(5, atRiskStudents.length)} of {atRiskStudents.length} at-risk students
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Recent Activities</h2>
            </div>
            <div className="overflow-y-auto max-h-[350px]">
              <ul className="divide-y divide-border">
                {isActivitiesLoading ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading activities...</p>
                  </div>
                ) : activities && activities.length > 0 ? (
                  activities
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((activity) => (
                    <li key={activity.id} className="px-4 py-3">
                      <div className="flex">
                        <div className="flex-shrink-0 mr-3">
                          <ActivityIcon type={activity.type} />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDateTime(activity.timestamp)}</p>
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
          </Card>
        </div>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={isStudentDetailsOpen} onOpenChange={setIsStudentDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Details
            </DialogTitle>
            <DialogDescription>
              Complete information about the selected student
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm font-medium">{selectedStudent.name || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">USN</label>
                    <p className="text-sm font-medium">{selectedStudent.usn}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm font-medium">{selectedStudent.email || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={selectedStudent.isActive ? "default" : "secondary"}>
                      {selectedStudent.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Current Semester</label>
                    <p className="text-sm font-medium">Semester {selectedStudent.semester}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Section</label>
                    <p className="text-sm font-medium">{selectedStudent.section}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Current Attendance</label>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`${(selectedStudent.attendance || 0) < 85 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-green-50 text-green-700 border-green-200'}`}
                      >
                        {(selectedStudent.attendance || 0).toFixed(1)}%
                      </Badge>
                      {(selectedStudent.attendance || 0) < 85 && (
                        <Badge variant="destructive" className="text-xs">
                          At Risk
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Assigned Mentor</label>
                    <p className="text-sm font-medium">{selectedStudent.mentorName || "Not assigned"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Student Mobile</label>
                    <p className="text-sm font-medium">{selectedStudent.mobileNumber || "Not provided"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Parent Mobile</label>
                    <p className="text-sm font-medium">{selectedStudent.parentMobileNumber || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                    <p className="text-sm font-medium">{selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : "Not available"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm font-medium">{selectedStudent.updatedAt ? new Date(selectedStudent.updatedAt).toLocaleDateString() : "Not available"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Risk Assessment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CircleAlert className="h-4 w-4" />
                  Risk Assessment
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">Attendance Below Threshold</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This student's attendance of {(selectedStudent.attendance || 0).toFixed(1)}% is below the required 85% threshold. 
                        Immediate attention and intervention may be necessary to prevent academic complications.
                      </p>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-red-600">
                          <strong>Recommended Actions:</strong>
                        </p>
                        <ul className="text-xs text-red-600 space-y-1 ml-4">
                          <li>• Contact the student to discuss attendance issues</li>
                          <li>• Schedule a meeting with the assigned mentor</li>
                          <li>• Review academic performance and provide support</li>
                          <li>• Consider additional academic resources or counseling</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsStudentDetailsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
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
            {changeLabel && <span className="text-xs text-muted-foreground ml-2">{changeLabel}</span>}
          </>
        )}
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
    </Card>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    'upload': <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><FileText className="h-4 w-4 text-primary" /></div>,
    'add': <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center"><PersonStanding className="h-4 w-4 text-green-600" /></div>,
    'warning': <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center"><CircleAlert className="h-4 w-4 text-amber-600" /></div>,
    'info': <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center"><FileText className="h-4 w-4 text-blue-600" /></div>,
    'transfer': <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><ArrowUp className="h-4 w-4 text-primary" /></div>,
    'delete': <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>,
  };
  
  return iconMap[type] || <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>;
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
