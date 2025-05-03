import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Search } from "lucide-react";
import { useState } from "react";
import AcademicForm from "@/components/academic-record/academic-form";
import { apiRequest } from "@/lib/queryClient";

type AtRiskMentee = {
  id: number;
  name?: string;
  usn: string;
  attendance?: number;
  semester: number;
  section: string;
  mobileNumber?: string;
  parentMobileNumber?: string;
  email?: string;
};

export default function MentorAtRisk() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedMentee, setSelectedMentee] = useState<AtRiskMentee | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  
  // Fetch at-risk mentees
  const { data: atRiskMentees, isLoading } = useQuery<AtRiskMentee[]>({
    queryKey: ["/api/mentor/at-risk-mentees"],
  });
  
  // Filter mentees based on search
  const filteredMentees = atRiskMentees?.filter(mentee => 
    mentee.name?.toLowerCase().includes(search.toLowerCase()) ||
    mentee.usn.toLowerCase().includes(search.toLowerCase())
  ) || [];
  
  const updateAcademicRecord = async (data: any) => {
    if (!selectedMentee) return;
    
    try {
      await apiRequest("POST", "/api/mentor/academic-records", {
        ...data,
        menteeId: selectedMentee.id,
      });
      
      toast({
        title: "Records updated",
        description: "The mentee's academic records have been successfully updated.",
      });
      setIsUpdateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to update records",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  return (
    <DashboardLayout pageTitle="At-Risk Mentees" pageDescription="Students with attendance below 85%">
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="flex items-start space-x-4 pt-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">Attention Required</h3>
            <p className="text-sm text-amber-800 mt-1">
              These students have attendance below 85% and may need additional support or intervention.
              Consider reaching out to them or their parents to discuss improvement strategies.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name or USN..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>USN</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Parent's Mobile</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-muted-foreground">Loading at-risk mentees...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredMentees.length > 0 ? (
              filteredMentees.map((mentee) => (
                <TableRow key={mentee.id}>
                  <TableCell className="font-medium">{mentee.name}</TableCell>
                  <TableCell>{mentee.usn}</TableCell>
                  <TableCell>{mentee.semester}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      {mentee.attendance?.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>{mentee.mobileNumber || "-"}</TableCell>
                  <TableCell>{mentee.parentMobileNumber || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMentee(mentee);
                          setIsUpdateDialogOpen(true);
                        }}
                      >
                        Update Records
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {search ? "No matching at-risk mentees found." : "No at-risk mentees found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      
      {/* Update Academic Record Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
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
              onSubmit={updateAcademicRecord}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
