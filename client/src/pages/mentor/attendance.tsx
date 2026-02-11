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
import { Calendar, Users, AlertTriangle, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

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

type AttendanceRecord = {
  id: number;
  menteeId: number;
  subjectId: number;
  attendance: number;
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

export default function MentorAttendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [attendanceValue, setAttendanceValue] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>(currentAcademicYear());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch mentees
  const { data: mentees, isLoading: isMenteesLoading } = useQuery<Mentee[]>({
    queryKey: ["/api/mentor/mentees"],
  });

  // Fetch subjects
  const { data: subjects, isLoading: isSubjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch attendance records
  const { data: attendanceRecords, isLoading: isRecordsLoading, error: recordsError } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/mentor/attendance-records", { academicYear }],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/mentor/attendance-records?academicYear=${academicYear}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch attendance records: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching attendance records:', error);
        throw error;
      }
    },
    retry: 2,
  });

  // Filter subjects by selected mentee's semester
  const filteredSubjects = subjects?.filter(
    (subject) => subject.semester === selectedMentee?.semester
  ) || [];

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: {
      menteeId: number;
      subjectId: number;
      attendance: number;
      semester: number;
      academicYear: string;
    }) => {
      const response = await apiRequest("POST", "/api/mentor/attendance", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/attendance-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentor/at-risk-mentees"] });
      toast({
        title: "Attendance updated",
        description: "The attendance record has been successfully updated.",
      });
      setSelectedMentee(null);
      setSelectedSubject(null);
      setAttendanceValue("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update attendance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMentee || !selectedSubject || !attendanceValue) {
      toast({
        title: "Missing information",
        description: "Please select a mentee, subject, and enter attendance percentage.",
        variant: "destructive",
      });
      return;
    }

    const attendance = parseFloat(attendanceValue);
    if (isNaN(attendance) || attendance < 0 || attendance > 100) {
      toast({
        title: "Invalid attendance",
        description: "Attendance must be a number between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    updateAttendanceMutation.mutate({
      menteeId: selectedMentee.id,
      subjectId: selectedSubject,
      attendance,
      semester: selectedMentee.semester,
      academicYear,
    });
    setIsSubmitting(false);
  };

  const getAttendanceStatus = (attendance: number) => {
    if (attendance >= 85) return { status: "good", color: "bg-green-100 text-green-800", icon: CheckCircle };
    if (attendance >= 75) return { status: "warning", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle };
    return { status: "critical", color: "bg-red-100 text-red-800", icon: AlertTriangle };
  };

  return (
    <DashboardLayout 
      pageTitle="Attendance Management" 
      pageDescription="Manage attendance records for your mentees"
    >
      <div className="space-y-6">
        {/* Add Attendance Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Add/Update Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <Label htmlFor="attendance">Attendance %</Label>
                  <Input
                    id="attendance"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={attendanceValue}
                    onChange={(e) => setAttendanceValue(e.target.value)}
                    placeholder="Enter percentage"
                  />
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

              <Button type="submit" disabled={isSubmitting || !selectedMentee || !selectedSubject || !attendanceValue}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Attendance
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Attendance Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Records ({academicYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRecordsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-muted-foreground">Loading attendance records...</p>
                </div>
              </div>
            ) : recordsError ? (
              <div className="text-center py-10">
                <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Records</h3>
                <p className="text-muted-foreground">
                  {recordsError.message || "Failed to load attendance records. Please try again."}
                </p>
              </div>
            ) : attendanceRecords && attendanceRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>USN</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => {
                      const status = getAttendanceStatus(record.attendance);
                      const StatusIcon = status.icon;
                      
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
                          <TableCell>Sem {record.semester}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{record.attendance.toFixed(1)}%</span>
                              <div className="w-16 bg-neutral-100 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    record.attendance >= 85 ? 'bg-green-500' : 
                                    record.attendance >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(record.attendance, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.status === "good" ? "Good" : 
                               status.status === "warning" ? "Warning" : "Critical"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No attendance records</h3>
                <p className="text-muted-foreground">
                  No attendance records found for the selected academic year.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
