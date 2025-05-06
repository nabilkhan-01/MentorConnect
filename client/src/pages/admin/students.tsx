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
import { Plus } from "lucide-react";

type StudentWithMentorInfo = Partial<Mentee & { name?: string, email?: string, attendance?: number, mentorName?: string }>;

export default function AdminStudents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
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
  
  return (
    <DashboardLayout pageTitle="Student Management" pageDescription="View and manage all students in the system">
      <div className="flex flex-col md:flex-row justify-between mb-6 items-start md:items-center">
        <div></div>
        <div className="flex gap-3 mt-4 md:mt-0">
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
          toast({
            title: "View Student",
            description: `Viewing ${student.name || 'student'}'s details`,
          });
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
              initialValues={selectedStudent}
              isSubmitting={updateStudentMutation.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
