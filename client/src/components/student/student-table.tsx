import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Trash2, Search } from "lucide-react";
import { Mentee } from "@shared/schema";

type StudentTableProps = {
  students: Partial<Mentee & { name?: string, email?: string, attendance?: number, atRisk?: boolean, mentorName?: string }>[];
  onDelete?: (id: number) => void;
  onEdit?: (student: Partial<Mentee>) => void;
  onView?: (student: Partial<Mentee>) => void;
  isLoading?: boolean;
};

export function StudentTable({
  students = [],
  onDelete,
  onEdit,
  onView,
  isLoading = false,
}: StudentTableProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Partial<Mentee> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Filter students based on search and semester filter
  const filteredStudents = students.filter((student) => {
    const searchMatch = 
      (student.name?.toLowerCase().includes(search.toLowerCase()) || 
       student.usn?.toLowerCase().includes(search.toLowerCase()) ||
       student.email?.toLowerCase().includes(search.toLowerCase()));
    
    const semesterMatch = 
      semesterFilter === "all" || 
      student.semester?.toString() === semesterFilter;
    
    return searchMatch && semesterMatch;
  });

  const handleDelete = (student: Partial<Mentee>) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedStudent && selectedStudent.id && onDelete) {
      onDelete(selectedStudent.id);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Student Deleted",
        description: `${selectedStudent.name || 'Student'} has been removed from the system.`,
      });
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name, USN, or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={semesterFilter} onValueChange={setSemesterFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>USN</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      <p className="text-muted-foreground">Loading students...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.usn}</TableCell>
                    <TableCell>{student.semester}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>
                      {student.attendance !== undefined && (
                        <div className="flex items-center">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.attendance < 85 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {student.attendance.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{student.mentorName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {onView && (
                          <Button variant="ghost" size="icon" onClick={() => onView(student)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button variant="ghost" size="icon" onClick={() => onEdit(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(student)}>
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
                    No students found.
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
              This will permanently delete {selectedStudent?.name || 'this student'}'s records from the system.
              This action cannot be undone.
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

export default StudentTable;
