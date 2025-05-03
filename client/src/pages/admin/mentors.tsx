import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import MentorForm from "@/components/mentor/mentor-form";
import MentorTable from "@/components/mentor/mentor-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";

type MentorWithDetails = {
  id: number;
  userId: number;
  department?: string;
  specialization?: string;
  mobileNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  name?: string;
  email?: string;
  menteeCount?: number;
};

export default function AdminMentors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorWithDetails | null>(null);
  
  // Fetch mentors
  const { data: mentors, isLoading } = useQuery<MentorWithDetails[]>({
    queryKey: ["/api/mentors"],
  });
  
  // Add mentor mutation
  const addMentorMutation = useMutation({
    mutationFn: async (mentorData: Partial<MentorWithDetails>) => {
      const response = await apiRequest("POST", "/api/admin/mentors", mentorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      toast({
        title: "Mentor added",
        description: "The mentor has been successfully added to the system.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add mentor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update mentor mutation
  const updateMentorMutation = useMutation({
    mutationFn: async (mentorData: MentorWithDetails) => {
      const response = await apiRequest("PUT", `/api/admin/mentors/${mentorData.id}`, mentorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      toast({
        title: "Mentor updated",
        description: "The mentor information has been successfully updated.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update mentor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete mentor mutation
  const deleteMentorMutation = useMutation({
    mutationFn: async (mentorId: number) => {
      await apiRequest("DELETE", `/api/admin/mentors/${mentorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      toast({
        title: "Mentor deleted",
        description: "The mentor has been removed from the system and their mentees have been reassigned.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete mentor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handlers
  const handleAddMentor = (data: Partial<MentorWithDetails>) => {
    addMentorMutation.mutate(data);
  };
  
  const handleEditMentor = (data: Partial<MentorWithDetails>) => {
    if (selectedMentor?.id) {
      updateMentorMutation.mutate({ ...selectedMentor, ...data } as MentorWithDetails);
    }
  };
  
  const handleDeleteMentor = (id: number) => {
    deleteMentorMutation.mutate(id);
  };
  
  const openEditDialog = (mentor: MentorWithDetails) => {
    setSelectedMentor(mentor);
    setIsEditDialogOpen(true);
  };
  
  return (
    <DashboardLayout pageTitle="Mentor Management" pageDescription="View and manage all mentors in the system">
      <div className="flex flex-col md:flex-row justify-between mb-6 items-start md:items-center">
        <div></div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Mentor
          </Button>
        </div>
      </div>
      
      <MentorTable 
        mentors={mentors || []}
        onEdit={openEditDialog}
        onDelete={handleDeleteMentor}
        onView={(mentor) => {
          toast({
            title: "View Mentor",
            description: `Viewing ${mentor.name || 'mentor'}'s details`,
          });
        }}
        isLoading={isLoading}
      />
      
      {/* Add Mentor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Mentor</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new mentor to the system.
            </DialogDescription>
          </DialogHeader>
          <MentorForm 
            onSubmit={handleAddMentor}
            isSubmitting={addMentorMutation.isPending}
            mode="add"
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Mentor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Mentor</DialogTitle>
            <DialogDescription>
              Update the mentor's information.
            </DialogDescription>
          </DialogHeader>
          {selectedMentor && (
            <MentorForm 
              onSubmit={handleEditMentor}
              initialValues={selectedMentor}
              isSubmitting={updateMentorMutation.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
