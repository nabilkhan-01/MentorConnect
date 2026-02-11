import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BookOpen, Users, Award, Loader2, Calculator, AlertCircle, Search } from "lucide-react";

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

type Subject = {
  id: number;
  code: string;
  name: string;
  semester: number;
};

type AcademicRecord = {
  id: number;
  menteeId: number;
  subjectId: number;
  cie1Marks: number | null;
  cie2Marks: number | null;
  cie3Marks: number | null;
  avgCieMarks: number | null;
  assignmentMarks: number | null;
  totalMarks: number | null;
  attendance: number | null;
  semester: number;
  academicYear: string;
  mentee?: {
    name?: string;
    usn: string;
  };
  subject?: {
    code: string;
    name: string;
  };
};

const currentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  return month >= 6 
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
};

const calculateGrade = (totalMarks: number, avgCieMarks?: number, assignmentMarks?: number): string => {
  // Fail conditions: avg CIE < 12 OR assignment marks < 8
  if (avgCieMarks !== undefined && avgCieMarks < 12) return "F";
  if (assignmentMarks !== undefined && assignmentMarks < 8) return "F";
  
  // Regular grade calculation based on total marks
  if (totalMarks >= 45) return "S";
  if (totalMarks >= 40) return "A";
  if (totalMarks >= 35) return "B";
  if (totalMarks >= 30) return "C";
  if (totalMarks >= 25) return "D";
  return "F";
};

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case "S": return "bg-green-100 text-green-800";
    case "A": return "bg-blue-100 text-blue-800";
    case "B": return "bg-yellow-100 text-yellow-800";
    case "C": return "bg-orange-100 text-orange-800";
    case "D": return "bg-red-100 text-red-800";
    case "F": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function MentorMarksGrades() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [cie1Marks, setCie1Marks] = useState<string>("");
  const [cie2Marks, setCie2Marks] = useState<string>("");
  const [cie3Marks, setCie3Marks] = useState<string>("");
  const [assignmentMarks, setAssignmentMarks] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>(currentAcademicYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch mentees
  const { data: mentees, isLoading: isMenteesLoading } = useQuery<Mentee[]>({
    queryKey: ["/api/mentor/mentees"],
  });

  // Fetch subjects
  const { data: subjects, isLoading: isSubjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch academic records
  const { data: academicRecords, isLoading: isRecordsLoading, error: recordsError } = useQuery<AcademicRecord[]>({
    queryKey: ["/api/mentor/academic-records", { academicYear }],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/mentor/academic-records?academicYear=${academicYear}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch academic records: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching academic records:', error);
        throw error;
      }
    },
    retry: 2,
  });

  // Filter academic records based on search term
  const filteredAcademicRecords = academicRecords?.filter(record => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      record.mentee?.name?.toLowerCase().includes(searchLower) ||
      record.mentee?.usn?.toLowerCase().includes(searchLower) ||
      record.subject?.name?.toLowerCase().includes(searchLower) ||
      record.subject?.code?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Filter subjects by selected mentee's semester
  const filteredSubjects = subjects?.filter(
    (subject) => subject.semester === selectedMentee?.semester
  ) || [];

  // Update academic record mutation
  const updateAcademicRecordMutation = useMutation({
    mutationFn: async (data: {
      menteeId: number;
      subjectId: number;
      cie1Marks?: number;
      cie2Marks?: number;
      cie3Marks?: number;
      assignmentMarks: number;
      semester: number;
      academicYear: string;
    }) => {
      const response = await apiRequest("POST", "/api/mentor/academic-records", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/academic-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/at-risk-mentees"] });
      toast({
        title: "Academic record updated",
        description: "The academic record has been successfully updated.",
      });
      setSelectedMentee(null);
      setSelectedSubject(null);
      setCie1Marks("");
      setCie2Marks("");
      setCie3Marks("");
      setAssignmentMarks("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update academic record",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMentee || !selectedSubject || !assignmentMarks) {
      toast({
        title: "Missing information",
        description: "Please select a mentee, subject, and enter assignment marks.",
        variant: "destructive",
      });
      return;
    }

    const assignment = parseFloat(assignmentMarks);
    if (isNaN(assignment) || assignment < 0 || assignment > 20) {
      toast({
        title: "Invalid assignment marks",
        description: "Assignment marks must be a number between 0 and 20.",
        variant: "destructive",
      });
      return;
    }

    // Validate CIE marks if provided
    const cieMarks = [];
    if (cie1Marks) {
      const cie1 = parseFloat(cie1Marks);
      if (isNaN(cie1) || cie1 < 0 || cie1 > 30) {
        toast({
          title: "Invalid CIE 1 marks",
          description: "CIE 1 marks must be a number between 0 and 30.",
          variant: "destructive",
        });
        return;
      }
      cieMarks.push(cie1);
    }
    
    if (cie2Marks) {
      const cie2 = parseFloat(cie2Marks);
      if (isNaN(cie2) || cie2 < 0 || cie2 > 30) {
        toast({
          title: "Invalid CIE 2 marks",
          description: "CIE 2 marks must be a number between 0 and 30.",
          variant: "destructive",
        });
        return;
      }
      cieMarks.push(cie2);
    }
    
    if (cie3Marks) {
      const cie3 = parseFloat(cie3Marks);
      if (isNaN(cie3) || cie3 < 0 || cie3 > 30) {
        toast({
          title: "Invalid CIE 3 marks",
          description: "CIE 3 marks must be a number between 0 and 30.",
          variant: "destructive",
        });
        return;
      }
      cieMarks.push(cie3);
    }

    setIsSubmitting(true);
    updateAcademicRecordMutation.mutate({
      menteeId: selectedMentee.id,
      subjectId: selectedSubject,
      cie1Marks: cie1Marks ? parseFloat(cie1Marks) : undefined,
      cie2Marks: cie2Marks ? parseFloat(cie2Marks) : undefined,
      cie3Marks: cie3Marks ? parseFloat(cie3Marks) : undefined,
      assignmentMarks: assignment,
      semester: selectedMentee.semester,
      academicYear,
    });
    setIsSubmitting(false);
  };

  return (
    <DashboardLayout 
      pageTitle="Marks & Grades Management" 
      pageDescription="Manage marks and grades for your mentees"
    >
      <div className="space-y-6">
        {/* Add/Update Marks Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Add/Update Marks & Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mentee">Select Mentee</Label>
                  <Select
                    value={selectedMentee?.id.toString() || ""}
                    onValueChange={(value) => {
                      const mentee = mentees?.find(m => m.id === parseInt(value));
                      setSelectedMentee(mentee || null);
                      setSelectedSubject(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose mentee" />
                    </SelectTrigger>
                    <SelectContent>
                      {isMenteesLoading ? (
                        <SelectItem value="loading">Loading mentees...</SelectItem>
                      ) : mentees && mentees.length > 0 ? (
                        mentees.map((mentee) => (
                          <SelectItem key={mentee.id} value={mentee.id.toString()}>
                            {mentee.name} ({mentee.usn}) - Sem {mentee.semester}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none">No mentees available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Select Subject</Label>
                  <Select
                    value={selectedSubject?.toString() || ""}
                    onValueChange={(value) => setSelectedSubject(parseInt(value))}
                    disabled={!selectedMentee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {isSubjectsLoading ? (
                        <SelectItem value="loading">Loading subjects...</SelectItem>
                      ) : filteredSubjects.length > 0 ? (
                        filteredSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.code} - {subject.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none">No subjects for this semester</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Select value={academicYear} onValueChange={setAcademicYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        currentAcademicYear(),
                        `${parseInt(currentAcademicYear().split('-')[0]) - 1}-${parseInt(currentAcademicYear().split('-')[1]) - 1}`,
                        `${parseInt(currentAcademicYear().split('-')[0]) - 2}-${parseInt(currentAcademicYear().split('-')[1]) - 2}`,
                      ].map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CIE Marks */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">CIE Marks (out of 30 each)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cie1">CIE 1 Marks</Label>
                    <Input
                      id="cie1"
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={cie1Marks}
                      onChange={(e) => setCie1Marks(e.target.value)}
                      placeholder="Enter CIE 1 marks"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cie2">CIE 2 Marks</Label>
                    <Input
                      id="cie2"
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={cie2Marks}
                      onChange={(e) => setCie2Marks(e.target.value)}
                      placeholder="Enter CIE 2 marks"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cie3">CIE 3 Marks</Label>
                    <Input
                      id="cie3"
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={cie3Marks}
                      onChange={(e) => setCie3Marks(e.target.value)}
                      placeholder="Enter CIE 3 marks"
                    />
                  </div>
                </div>
              </div>

              {/* Assignment Marks */}
              <div className="space-y-2">
                <Label htmlFor="assignment">Assignment Marks (out of 20) *</Label>
                <Input
                  id="assignment"
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={assignmentMarks}
                  onChange={(e) => setAssignmentMarks(e.target.value)}
                  placeholder="Enter assignment marks"
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Calculation Formula:</p>
                    <p>• Average CIE Marks = (CIE1 + CIE2 + CIE3) / Number of CIE tests taken</p>
                    <p>• Total Marks = Average CIE Marks + Assignment Marks (out of 50)</p>
                    <p>• <strong>Fail Conditions:</strong> Average CIE &lt; 12 OR Assignment Marks &lt; 8</p>
                    <p>• Grade: S (45-50), A (40-44), B (35-39), C (30-34), D (25-29), F (0-24 or fail conditions)</p>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting || !selectedMentee || !selectedSubject || !assignmentMarks}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Academic Record
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Academic Records Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Academic Records ({academicYear})
              </CardTitle>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search-academic-records"
                  name="search-academic-records"
                  placeholder="Search by student name, USN, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isRecordsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-muted-foreground">Loading academic records...</p>
                </div>
              </div>
            ) : recordsError ? (
              <div className="text-center py-10">
                <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Records</h3>
                <p className="text-muted-foreground">
                  {recordsError.message || "Failed to load academic records. Please try again."}
                </p>
              </div>
            ) : filteredAcademicRecords && filteredAcademicRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>USN</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>CIE Marks</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAcademicRecords.map((record) => {
                      const grade = record.totalMarks ? calculateGrade(record.totalMarks, record.avgCieMarks || undefined, record.assignmentMarks || undefined) : "N/A";
                      const gradeColor = record.totalMarks ? getGradeColor(grade) : "bg-gray-100 text-gray-800";
                      
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.mentee?.name || "N/A"}
                          </TableCell>
                          <TableCell>
                            <code className="px-2 py-1 bg-muted rounded text-sm">
                              {record.mentee?.usn}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{record.subject?.code}</div>
                              <div className="text-sm text-muted-foreground">{record.subject?.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {record.avgCieMarks !== null ? (
                                <span className="font-medium">{record.avgCieMarks.toFixed(1)}/30</span>
                              ) : (
                                <span className="text-muted-foreground">Not available</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.assignmentMarks !== null ? (
                              <span className="font-medium">{record.assignmentMarks}/20</span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.totalMarks !== null ? (
                              <span className="font-medium">{record.totalMarks.toFixed(1)}/50</span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${gradeColor} font-medium`}>
                              {grade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.attendance !== null ? (
                              <span className="font-medium">{record.attendance.toFixed(1)}%</span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "No matching records found" : "No academic records"}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? `No academic records found matching "${searchTerm}". Try adjusting your search terms.`
                    : "No academic records found for the selected academic year."
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
