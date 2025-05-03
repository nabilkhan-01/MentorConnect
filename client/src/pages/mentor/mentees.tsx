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
import { Plus, AlertCircle } from "lucide-react";
import AcademicForm from "@/components/academic-record/academic-form";

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

export default function MentorMentees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAcademicDialogOpen, setIsAcademicDialogOpen] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch mentees
  const { data: mentees, isLoading } = useQuery<Mentee[]>({
    queryKey: ["/api/mentor/mentees"],
  });
  
  // Add mentee mutation
  const addMenteeMutation = useMutation({
    mutationFn: async (menteeData: Partial<Mentee>) => {
      const response = await apiRequest("POST", "/api/mentor/mentees", menteeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
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
  
  // Update academic record mutation
  const updateAcademicRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/mentor/academic-records", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
      toast({
        title: "Records updated",
        description: "The mentee's academic records have been successfully updated.",
      });
      setIsAcademicDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update records",
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
      
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
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
  const filteredMentees = mentees?.filter(mentee => {
    if (activeTab === "all") return true;
    if (activeTab === "at-risk") return mentee.attendance !== undefined && mentee.attendance < 85;
    
    const semesterMap: Record<string, number> = {
      "junior": 4,
      "senior": 8
    };
    
    return mentee.semester <= semesterMap[activeTab];
  }) || [];
  
  const atRiskCount = mentees?.filter(mentee => mentee.attendance !== undefined && mentee.attendance < 85).length || 0;
  
  // Handlers
  const handleAddMentee = (data: any) => {
    addMenteeMutation.mutate(data);
  };
  
  const openAcademicDialog = (mentee: Mentee) => {
    setSelectedMentee(mentee);
    setIsAcademicDialogOpen(true);
  };
  
  const handleUpdateAcademicRecord = (data: any) => {
    if (selectedMentee?.id) {
      updateAcademicRecordMutation.mutate({
        ...data,
        menteeId: selectedMentee.id,
      });
    }
  };
  
  return (
    <DashboardLayout pageTitle="My Mentees" pageDescription="View and manage your assigned mentees">
      <div className="flex flex-col md:flex-row justify-between mb-6 items-start md:items-center">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full md:w-auto"
        >
          <TabsList className="grid w-full md:w-auto grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="junior">Junior</TabsTrigger>
            <TabsTrigger value="senior">Senior</TabsTrigger>
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
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-start space-x-4 pt-6">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">At-Risk Students</h3>
              <p className="text-sm text-red-700 mt-1">
                These students have attendance below 85% and may need additional support or intervention.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <StudentTable 
        students={filteredMentees}
        onView={openAcademicDialog}
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
          />
        </DialogContent>
      </Dialog>
      
      {/* Academic Record Dialog */}
      <Dialog open={isAcademicDialogOpen} onOpenChange={setIsAcademicDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Update Academic Records</DialogTitle>
            <DialogDescription>
              {selectedMentee && `Updating records for ${selectedMentee.name} (${selectedMentee.usn})`}
            </DialogDescription>
          </DialogHeader>
          {selectedMentee && (
            <AcademicForm 
              mentee={selectedMentee}
              onSubmit={handleUpdateAcademicRecord}
              isSubmitting={updateAcademicRecordMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
