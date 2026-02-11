import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Trash2, Search, BadgeCheck, BadgeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type MentorTableProps = {
  mentors: Array<{
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
  }>;
  onDelete?: (id: number) => void;
  onEdit?: (mentor: any) => void;
  onView?: (mentor: any) => void;
  isLoading?: boolean;
};

export function MentorTable({
  mentors = [],
  onDelete,
  onEdit,
  onView,
  isLoading = false,
}: MentorTableProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Filter mentors based on search
  const filteredMentors = mentors.filter((mentor) => {
    const searchLower = search.toLowerCase();
    return (
      (mentor.name?.toLowerCase().includes(searchLower) || false) ||
      (mentor.email?.toLowerCase().includes(searchLower) || false) ||
      (mentor.department?.toLowerCase().includes(searchLower) || false) ||
      (mentor.specialization?.toLowerCase().includes(searchLower) || false)
    );
  });

  const handleDelete = (mentor: any) => {
    setSelectedMentor(mentor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedMentor && selectedMentor.id && onDelete) {
      onDelete(selectedMentor.id);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Mentor Deleted",
        description: `${selectedMentor.name || 'Mentor'} has been removed from the system.`,
      });
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            id="search-mentors"
            name="search-mentors"
            placeholder="Search by name, email, department" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Mentees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      <p className="text-muted-foreground">Loading mentors...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMentors.length > 0 ? (
                filteredMentors.map((mentor) => (
                  <TableRow key={mentor.id}>
                    <TableCell className="font-medium">{mentor.name}</TableCell>
                    <TableCell>{mentor.email}</TableCell>
                    <TableCell>{mentor.department || "-"}</TableCell>
                    <TableCell>{mentor.specialization || "-"}</TableCell>
                    <TableCell>{mentor.menteeCount !== undefined ? mentor.menteeCount : "-"}</TableCell>
                    <TableCell>
                      {mentor.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center w-fit">
                          <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center w-fit">
                          <BadgeX className="h-3.5 w-3.5 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {onView && (
                          <Button variant="ghost" size="icon" onClick={() => onView(mentor)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button variant="ghost" size="icon" onClick={() => onEdit(mentor)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(mentor)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No mentors found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedMentor?.name || 'this mentor'} from the system.
              All their mentees will be automatically reassigned to other mentors. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MentorTable;
