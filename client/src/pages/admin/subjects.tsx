import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusCircle, Trash2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Subject } from "@shared/schema";

type SubjectFormState = {
  id?: number,
  code: string,
  name: string,
  semester: string
};

type SubjectTab = {
  semester: number,
  label: string
};

export default function AdminSubjectsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState<string>("1");
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [formState, setFormState] = useState<SubjectFormState>({
    code: "",
    name: "",
    semester: "1"
  });

  // Tabs for all 8 semesters
  const tabs: SubjectTab[] = useMemo(() => [
    { semester: 1, label: "Semester 1" },
    { semester: 2, label: "Semester 2" },
    { semester: 3, label: "Semester 3" },
    { semester: 4, label: "Semester 4" },
    { semester: 5, label: "Semester 5" },
    { semester: 6, label: "Semester 6" },
    { semester: 7, label: "Semester 7" },
    { semester: 8, label: "Semester 8" },
  ], []);

  // Get all subjects
  const { data: subjects = [], isLoading, refetch } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Filter subjects by currently selected semester
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => subject.semester === parseInt(tab));
  }, [subjects, tab]);

  // Create subject mutation
  const createSubjectMutation = useMutation({
    mutationFn: async (subjectData: SubjectFormState) => {
      const res = await apiRequest("POST", "/api/admin/subjects", subjectData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: "Subject created",
        description: "The subject has been created successfully.",
      });
      setShowDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating subject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update subject mutation
  const updateSubjectMutation = useMutation({
    mutationFn: async (subjectData: SubjectFormState) => {
      const res = await apiRequest("PUT", `/api/admin/subjects/${subjectData.id}`, subjectData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: "Subject updated",
        description: "The subject has been updated successfully.",
      });
      setShowDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating subject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/subjects/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: "Subject deleted",
        description: "The subject has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting subject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset form to initial state
  const resetForm = () => {
    setFormState({
      code: "",
      name: "",
      semester: tab,
    });
    setEditMode(false);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formState.code.trim() || !formState.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (editMode && formState.id) {
      updateSubjectMutation.mutate(formState);
    } else {
      createSubjectMutation.mutate(formState);
    }
  };

  // Open dialog to edit a subject
  const handleEdit = (subject: Subject) => {
    setFormState({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      semester: subject.semester.toString(),
    });
    setEditMode(true);
    setShowDialog(true);
  };

  // Open dialog to add a new subject
  const handleAdd = () => {
    resetForm();
    setShowDialog(true);
  };

  // Handle subject deletion
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this subject? This action cannot be undone.")) {
      deleteSubjectMutation.mutate(id);
    }
  };

  // Update form semester when tab changes
  useEffect(() => {
    setFormState(prev => ({ ...prev, semester: tab }));
  }, [tab]);

  // If user is not an admin, show unauthorized message
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subject Management</CardTitle>
            <CardDescription>
              Manage subjects for different semesters
            </CardDescription>
          </div>
          <Button onClick={handleAdd} className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4" />
            Add Subject
          </Button>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 mb-8">
          {tabs.map((t) => (
            <TabsTrigger key={t.semester} value={t.semester.toString()}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.semester} value={t.semester.toString()}>
            <Card>
              <CardHeader>
                <CardTitle>{t.label} Subjects</CardTitle>
                <CardDescription>
                  Manage subjects for {t.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Loading subjects...</p>
                ) : filteredSubjects.length === 0 ? (
                  <p>No subjects found for this semester. Add a subject using the button above.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject Code</TableHead>
                        <TableHead>Subject Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubjects.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell>{subject.code}</TableCell>
                          <TableCell>{subject.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(subject)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(subject.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Subject Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Subject" : "Add New Subject"}</DialogTitle>
            <DialogDescription>
              {editMode
                ? "Update the details of an existing subject."
                : "Add a new subject to the system."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Subject Code
                </Label>
                <Input
                  id="code"
                  value={formState.code}
                  onChange={(e) =>
                    setFormState({ ...formState, code: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Subject Name
                </Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState({ ...formState, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="semester" className="text-right">
                  Semester
                </Label>
                <Select
                  value={formState.semester}
                  onValueChange={(value) =>
                    setFormState({ ...formState, semester: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {tabs.map((t) => (
                      <SelectItem
                        key={t.semester}
                        value={t.semester.toString()}
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowDialog(false);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createSubjectMutation.isPending ||
                  updateSubjectMutation.isPending
                }
              >
                <Save className="mr-2 h-4 w-4" />
                {editMode ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
