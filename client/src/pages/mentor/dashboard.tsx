import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ExcelUpload from "@/components/excel/excel-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Users, UserRound, CircleAlert } from "lucide-react";
import { StudentDetailsDialog } from "@/components/student/student-details-dialog";

type DashboardStats = {
  mentorId: number;
  totalMentees: number;
  atRiskMentees: number;
  averageAttendance: number;
  semesterDistribution: Record<number, number>;
};

type AtRiskMentee = {
  id: number;
  name?: string;
  usn: string;
  attendance?: number;
  semester: number;
  section: string;
};

export default function MentorDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<AtRiskMentee | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  // Fetch dashboard stats
  const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/mentor/dashboard/stats"],
  });
  
  // Fetch at-risk mentees
  const { data: atRiskMentees, isLoading: isAtRiskLoading } = useQuery<AtRiskMentee[]>({
    queryKey: ["/api/mentor/at-risk-mentees"],
  });
  
  // Handle Excel upload
  const handleExcelUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await fetch('/api/mentor/upload-mentees', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/at-risk-mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      
      toast({
        title: "Upload successful",
        description: "Mentee data has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload.",
        variant: "destructive",
      });
    }
  };

  const handleViewStudent = (student: AtRiskMentee) => {
    setSelectedStudent(student);
    setIsDetailsDialogOpen(true);
  };

  return (
    <DashboardLayout 
      pageTitle="Mentor Dashboard" 
      pageDescription="Overview of your mentees and performance metrics"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div></div> {/* Empty div to maintain spacing with flex-between */}
        <div className="mt-4 md:mt-0">
          <ExcelUpload 
            onUpload={handleExcelUpload} 
            buttonText="Upload Mentee Data"
            dialogTitle="Upload Mentee Data"
            dialogDescription="Upload an Excel sheet containing mentee data to add to your mentee group."
          />
        </div>
      </div>
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Mentees Card */}
        <Card className="p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-primary-100 p-3 mr-4">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Total Mentees</p>
              <p className="text-2xl font-bold text-foreground">
                {isStatsLoading ? "Loading..." : stats?.totalMentees}
              </p>
            </div>
          </div>
        </Card>
        
        {/* At Risk Mentees Card */}
        <Card className="p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3 mr-4">
              <CircleAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">At-Risk Mentees</p>
              <p className="text-2xl font-bold text-foreground">
                {isStatsLoading ? "Loading..." : stats?.atRiskMentees}
              </p>
            </div>
          </div>
        </Card>
        
        {/* Average Attendance Card */}
        <Card className="p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-secondary-100 p-3 mr-4">
              <UserRound className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Average Attendance</p>
              <p className="text-2xl font-bold text-foreground">
                {isStatsLoading
                  ? "Loading..."
                  : stats?.averageAttendance != null
                    ? `${stats.averageAttendance.toFixed(1)}%`
                    : "N/A"}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* At-Risk Mentees & Semester Distribution Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* At-Risk Mentees Section */}
        <Card className="lg:col-span-2">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-foreground">At-Risk Mentees</h2>
            <Button asChild variant="link" size="sm" className="text-primary">
              <a href="/mentor/at-risk">View All</a>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>USN</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isAtRiskLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading mentees...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : atRiskMentees && atRiskMentees.length > 0 ? (
                  atRiskMentees.slice(0, 5).map((mentee) => (
                    <TableRow key={mentee.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{mentee.name}</TableCell>
                      <TableCell>{mentee.usn}</TableCell>
                      <TableCell>{mentee.semester}</TableCell>
                      <TableCell>
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          {mentee.attendance?.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-primary p-0"
                          onClick={() => handleViewStudent(mentee)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No at-risk mentees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Semester Distribution */}
        <Card className="lg:col-span-1">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground">Semester Distribution</h2>
          </div>
          <div className="p-4">
            {isStatsLoading ? (
              <div className="flex flex-col items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading data...</p>
              </div>
            ) : (
              <>
                {stats?.semesterDistribution && Object.keys(stats.semesterDistribution).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.semesterDistribution)
                      .filter(([, count]) => count > 0)
                      .map(([semester, count]) => (
                        <div key={semester} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Semester {semester}</span>
                            <span className="font-semibold">{count} mentees</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2" 
                              style={{ width: `${(count / stats.totalMentees) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <BarChart className="h-12 w-12 text-neutral-300 mb-3" />
                    <p className="text-muted-foreground">No distribution data available</p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Student Details Dialog */}
      <StudentDetailsDialog
        student={selectedStudent}
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
      />
    </DashboardLayout>
  );
}
