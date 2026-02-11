import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StudentForm from "@/components/student/student-form";
import StudentTable from "@/components/student/student-table";
import ExcelUpload from "@/components/excel/excel-upload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, AlertCircle, Calendar, BookOpen, BarChart3 } from "lucide-react";

type Mentee = {
  id: number;
  userId: number;
  usn: string;
  mentorId: number | null;
  semester: number;
  section: string;
  mobileNumber: string | null;
  parentMobileNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  name?: string;
  email?: string;
  attendance?: number;
};

type MentorDashboardStats = {
  mentorId: number;
  totalMentees: number;
  atRiskMentees: number;
  averageAttendance: number;
  semesterDistribution: Record<number, number>;
};

export default function MentorMentees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch mentees
  const { data: mentees, isLoading } = useQuery<Mentee[]>({
    queryKey: ["/api/mentor/mentees"],
  });

  // Fetch current mentor info to get mentor ID
  const { data: mentorStats } = useQuery<MentorDashboardStats>({
    queryKey: ["/api/mentor/dashboard/stats"],
  });
  
  // Add mentee mutation
  const addMenteeMutation = useMutation({
    mutationFn: async (menteeData: Partial<Mentee>) => {
      const response = await apiRequest("POST", "/api/mentor/mentees", menteeData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/at-risk-mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      toast({
        title: "Mentee added",
        description: "The mentee has been successfully added to your group.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add mentee",
        description: error.message,
        variant: "destructive",
      });
    },
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
  
  // Filter mentees based on active tab
  const filteredMentees = (mentees?.filter(mentee => {
    if (activeTab === "all") return true;
    if (activeTab === "at-risk") return mentee.attendance !== undefined && mentee.attendance < 85;
    
    // For "all" tab, show all mentees
    return true;
  }) || []);
  
  const atRiskCount = mentees?.filter(mentee => mentee.attendance !== undefined && mentee.attendance < 85).length || 0;
  
  // Handlers
  const handleAddMentee = (data: any) => {
    addMenteeMutation.mutate(data);
  };
  
  return (
    <DashboardLayout pageTitle="My Mentees" pageDescription="View and manage your assigned mentees">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/mentor/attendance'}>
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800">Manage Attendance</h3>
              <p className="text-sm text-neutral-500">Add and update attendance records</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/mentor/marks-grades'}>
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <BookOpen className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800">Marks & Grades</h3>
              <p className="text-sm text-neutral-500">Enter CIE marks and assignments</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/mentor/mentees-data'}>
          <div className="flex items-center">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800">Data Export</h3>
              <p className="text-sm text-neutral-500">Export comprehensive mentee data</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between mb-6 items-start md:items-center">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full md:w-auto"
        >
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="at-risk" className="relative">
              At-Risk
              {atRiskCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                  {atRiskCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          <ExcelUpload onUpload={handleExcelUpload} buttonText="Upload Excel" />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Mentee
          </Button>
        </div>
      </div>
      
      {activeTab === "at-risk" && atRiskCount > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardContent className="flex items-start space-x-4 pt-6">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-100">At-Risk Students</h3>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                These students have attendance below 85% and may need additional support or intervention.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <StudentTable 
        students={filteredMentees.map(mentee => ({
          ...mentee,
          createdAt: new Date(mentee.createdAt),
          updatedAt: new Date(mentee.updatedAt),
        }))}
        onView={(student) => {
          // Navigate to data overview page for detailed view
          window.location.href = '/mentor/mentees-data';
        }}
        isLoading={isLoading}
      />
      
      {/* Add Mentee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Mentee</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new mentee to your group.
            </DialogDescription>
          </DialogHeader>
          <StudentForm 
            onSubmit={handleAddMentee}
            isSubmitting={addMenteeMutation.isPending}
            mode="add"
            currentMentorId={mentorStats?.mentorId}
          />
        </DialogContent>
      </Dialog>
      
    </DashboardLayout>
  );
}
