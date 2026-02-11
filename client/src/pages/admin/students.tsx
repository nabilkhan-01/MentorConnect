import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StudentTable from "@/components/student/student-table";
import StudentForm from "@/components/student/student-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mentee } from "@shared/schema";
import { Plus, Download } from "lucide-react";

type StudentWithMentorInfo = Partial<Mentee & { name?: string, email?: string, attendance?: number, mentorName?: string }>;

export default function AdminStudents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithMentorInfo | null>(null);
  
  // Fetch students
  const { data: students, isLoading } = useQuery<StudentWithMentorInfo[]>({
    queryKey: ["/api/admin/students"],
  });
  
  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (studentData: StudentWithMentorInfo) => {
      const response = await apiRequest("POST", "/api/admin/students", studentData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
      toast({
        title: "Student added",
        description: "The student has been successfully added to the system.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add student",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async (studentData: StudentWithMentorInfo) => {
      const response = await apiRequest("PUT", `/api/admin/students/${studentData.id}`, studentData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
      toast({
        title: "Student updated",
        description: "The student information has been successfully updated.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update student",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await apiRequest("DELETE", `/api/admin/students/${studentId}`);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
      toast({
        title: "Student deleted",
        description: "The student has been removed from the system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete student",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  

  
  // Handlers
  const handleAddStudent = (data: StudentWithMentorInfo) => {
    addStudentMutation.mutate(data);
  };
  
  const handleEditStudent = (data: StudentWithMentorInfo) => {
    if (selectedStudent?.id) {
      updateStudentMutation.mutate({ ...data, id: selectedStudent.id });
    }
  };
  
  const handleDeleteStudent = (id: number) => {
    deleteStudentMutation.mutate(id);
  };
  
  const openEditDialog = (student: StudentWithMentorInfo) => {
    setSelectedStudent(student);
    setIsEditDialogOpen(true);
  };
  
  const handleExportData = () => {
    if (!students || students.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no students to export.",
        variant: "destructive",
      });
      return;
    }

    // Convert data to CSV format
    const headers = ["Name", "USN", "Email", "Semester", "Section", "Mobile Number", "Parent Mobile Number", "Mentor", "Attendance"];
    const csvData = students.map(student => [
      student.name || "",
      student.usn || "",
      student.email || "",
      student.semester || "",
      student.section || "",
      student.mobileNumber || "",
      student.parentMobileNumber || "",
      student.mentorName || "",
      student.attendance ? `${student.attendance.toFixed(1)}%` : ""
    ]);
    
    // Create CSV string
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `students_data_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: "Student data has been exported to CSV.",
    });
  };
  
  return (
    <DashboardLayout pageTitle="Student Management" pageDescription="View and manage all students in the system">
      <div className="flex flex-col md:flex-row justify-between mb-6 items-start md:items-center">
        <div></div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button onClick={handleExportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>
      
      <StudentTable 
        students={students || []}
        onEdit={openEditDialog}
        onDelete={handleDeleteStudent}
        onView={(student) => {
          setSelectedStudent(student);
          setIsViewDialogOpen(true);
        }}
        isLoading={isLoading}
      />
      
      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new student to the system.
            </DialogDescription>
          </DialogHeader>
          <StudentForm 
            onSubmit={handleAddStudent}
            isSubmitting={addStudentMutation.isPending}
            mode="add"
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student's information.
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <StudentForm 
              onSubmit={handleEditStudent}
              initialValues={{
                ...selectedStudent,
                mobileNumber: selectedStudent.mobileNumber ?? undefined,
                parentMobileNumber: selectedStudent.parentMobileNumber ?? undefined,
                mentorId: selectedStudent.mentorId ?? undefined,
              }}
              isSubmitting={updateStudentMutation.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Student Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Detailed information about the student.
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Basic Information</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd>{selectedStudent.name || 'N/A'}</dd>
                    <dt className="text-muted-foreground">USN:</dt>
                    <dd>{selectedStudent.usn || 'N/A'}</dd>
                    <dt className="text-muted-foreground">Email:</dt>
                    <dd>{selectedStudent.email || 'N/A'}</dd>
                  </dl>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Academic Information</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Semester:</dt>
                    <dd>{selectedStudent.semester || 'N/A'}</dd>
                    <dt className="text-muted-foreground">Section:</dt>
                    <dd>{selectedStudent.section || 'N/A'}</dd>
                    <dt className="text-muted-foreground">Attendance:</dt>
                    <dd>
                      {selectedStudent.attendance !== undefined ? (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedStudent.attendance < 85 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {selectedStudent.attendance.toFixed(1)}%
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </dd>
                  </dl>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-sm">Contact Information</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Mobile Number:</dt>
                  <dd>{selectedStudent.mobileNumber || 'N/A'}</dd>
                  <dt className="text-muted-foreground">Parent Mobile Number:</dt>
                  <dd>{selectedStudent.parentMobileNumber || 'N/A'}</dd>
                </dl>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-sm">Mentor Information</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Mentor:</dt>
                  <dd>{selectedStudent.mentorName || 'No mentor assigned'}</dd>
                </dl>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setIsViewDialogOpen(false)} variant="outline">
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
