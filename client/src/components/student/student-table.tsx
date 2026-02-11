import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Trash2, Search, User, Mail, Phone, Calendar, BookOpen, Award } from "lucide-react";
import { Mentee } from "@shared/schema";

type StudentRow = Partial<
  Mentee & {
    name?: string;
    email?: string;
    attendance?: number;
    atRisk?: boolean;
    mentorName?: string;
  }
>;

type StudentTableProps = {
  students: StudentRow[];
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
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

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

  const handleViewDetails = (student: Partial<Mentee>) => {
    setSelectedStudent(student);
    setIsDetailsDialogOpen(true);
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
            id="search-students"
            name="search-students"
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {onView && (
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(student)}>
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
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Details - {selectedStudent?.name}
            </DialogTitle>
            <DialogDescription>
              Complete information about {selectedStudent?.name} ({selectedStudent?.usn})
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Full Name</p>
                          <p className="text-sm text-muted-foreground">{selectedStudent.name || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">USN</p>
                          <p className="text-sm text-muted-foreground font-mono">{selectedStudent.usn}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">{selectedStudent.email || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Semester</p>
                          <Badge variant="outline">Semester {selectedStudent.semester}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Section</p>
                          <Badge variant="outline">Section {selectedStudent.section}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Mobile Number</p>
                          <p className="text-sm text-muted-foreground">{selectedStudent.mobileNumber || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Academic Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Academic Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedStudent.attendance !== undefined ? `${selectedStudent.attendance.toFixed(1)}%` : "N/A"}
                      </div>
                      <div className="text-sm text-blue-800">Average Attendance</div>
                      {selectedStudent.attendance !== undefined && (
                        <div className="mt-2">
                          <div className="w-full bg-blue-100 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                selectedStudent.attendance >= 85 ? 'bg-green-500' : 
                                selectedStudent.attendance >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(selectedStudent.attendance, 100)}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${
                            selectedStudent.attendance >= 85 ? 'text-green-600' : 
                            selectedStudent.attendance >= 75 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {selectedStudent.attendance >= 85 ? 'Good' : 
                             selectedStudent.attendance >= 75 ? 'Warning' : 'Critical'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedStudent.semester}
                      </div>
                      <div className="text-sm text-green-800">Current Semester</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedStudent.section}
                      </div>
                      <div className="text-sm text-purple-800">Section</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Student Mobile</p>
                          <p className="text-sm text-muted-foreground">{selectedStudent.mobileNumber || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Parent Mobile</p>
                          <p className="text-sm text-muted-foreground">{selectedStudent.parentMobileNumber || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedStudent.isActive ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-sm font-medium">
                        {selectedStudent.isActive ? 'Active Student' : 'Inactive Student'}
                      </span>
                    </div>
                    {selectedStudent.attendance !== undefined && selectedStudent.attendance < 85 && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        At Risk
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
