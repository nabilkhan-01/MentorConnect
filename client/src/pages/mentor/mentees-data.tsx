import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Users, TrendingUp, AlertTriangle, AlertCircle, CheckCircle, Download, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  subject?: {
    code: string;
    name: string;
  };
};

type MenteeWithAcademicData = Mentee & {
  academicRecords: AcademicRecord[];
  averageMarks: number;
  totalSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  overallGrade: string;
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
    case "F": return "bg-muted text-foreground";
    default: return "bg-muted text-foreground";
  }
};

const getAttendanceStatus = (attendance: number) => {
  if (attendance >= 85) return { status: "good", color: "bg-green-100 text-green-800", icon: CheckCircle };
  if (attendance >= 75) return { status: "warning", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle };
  return { status: "critical", color: "bg-red-100 text-red-800", icon: AlertTriangle };
};

export default function MentorMenteesData() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [academicYear, setAcademicYear] = useState<string>(currentAcademicYear());

  // Fetch mentees
  const { data: mentees, isLoading: isMenteesLoading } = useQuery<Mentee[]>({
    queryKey: ["/api/mentor/mentees"],
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

  // Process mentees with academic data - only include mentees who have records for the selected academic year
  const menteesWithData: MenteeWithAcademicData[] = mentees?.map(mentee => {
    const records = academicRecords?.filter(record => record.menteeId === mentee.id) || [];
    const totalMarks = records.filter(r => r.totalMarks !== null).map(r => r.totalMarks!);
    const averageMarks = totalMarks.length > 0 ? totalMarks.reduce((sum, mark) => sum + mark, 0) / totalMarks.length : 0;
    
    // Calculate average CIE and assignment marks for overall grade
    const avgCieMarks = records.filter(r => r.avgCieMarks !== null).map(r => r.avgCieMarks!);
    const averageCieMarks = avgCieMarks.length > 0 ? avgCieMarks.reduce((sum, mark) => sum + mark, 0) / avgCieMarks.length : undefined;
    
    const assignmentMarks = records.filter(r => r.assignmentMarks !== null).map(r => r.assignmentMarks!);
    const averageAssignmentMarks = assignmentMarks.length > 0 ? assignmentMarks.reduce((sum, mark) => sum + mark, 0) / assignmentMarks.length : undefined;
    
    const passedSubjects = records.filter(r => {
      if (r.totalMarks === null) return false;
      // Check fail conditions: avg CIE < 12 OR assignment marks < 8
      if (r.avgCieMarks !== null && r.avgCieMarks < 12) return false;
      if (r.assignmentMarks !== null && r.assignmentMarks < 8) return false;
      // Check total marks >= 25
      return r.totalMarks >= 25;
    }).length;
    
    const failedSubjects = records.filter(r => {
      if (r.totalMarks === null) return false;
      // Check fail conditions: avg CIE < 12 OR assignment marks < 8
      if (r.avgCieMarks !== null && r.avgCieMarks < 12) return true;
      if (r.assignmentMarks !== null && r.assignmentMarks < 8) return true;
      // Check total marks < 25
      return r.totalMarks < 25;
    }).length;
    const overallGrade = averageMarks > 0 ? calculateGrade(averageMarks, averageCieMarks, averageAssignmentMarks) : "N/A";

    // Calculate average attendance from records
    const attendanceRecords = records.filter(r => r.attendance !== null);
    const averageAttendance = attendanceRecords.length > 0 
      ? attendanceRecords.reduce((sum, r) => sum + (r.attendance || 0), 0) / attendanceRecords.length 
      : mentee.attendance || 0;

    // Debug logging
    console.log(`Mentee ${mentee.name} (${mentee.usn}):`, {
      recordsCount: records.length,
      totalMarks,
      averageMarks,
      passedSubjects,
      failedSubjects,
      overallGrade,
      averageAttendance
    });

    return {
      ...mentee,
      academicRecords: records,
      averageMarks,
      totalSubjects: records.length,
      passedSubjects,
      failedSubjects,
      overallGrade,
      attendance: averageAttendance,
    };
  }).filter(mentee => {
    // Only include mentees who have at least one academic record for the selected academic year
    // This ensures that changing the academic year filter actually changes the displayed mentees
    return mentee.academicRecords.length > 0;
  }) || [];

  // Debug logging
  console.log('Raw mentees data:', mentees);
  console.log('Academic records:', academicRecords);
  console.log('Mentees with data:', menteesWithData);

  // Filter mentees
  const filteredMentees = menteesWithData.filter(mentee => {
    // Always log the first few mentees to see what we're working with
    if (menteesWithData.indexOf(mentee) < 3) {
      console.log(`Sample mentee ${mentee.name} (${mentee.usn}):`, {
        name: mentee.name,
        usn: mentee.usn,
        semester: mentee.semester,
        section: mentee.section,
        email: mentee.email
      });
    }
    
    const matchesSearch = !searchTerm || 
      mentee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentee.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentee.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSemester = selectedSemester === "all" || mentee.semester.toString() === selectedSemester;
    const matchesSection = selectedSection === "all" || mentee.section === selectedSection;
    
    const isIncluded = matchesSearch && matchesSemester && matchesSection;
    
    // Debug logging for filtering
    if (searchTerm || selectedSemester !== "all" || selectedSection !== "all") {
      console.log(`Filtering mentee ${mentee.name} (${mentee.usn}):`, {
        searchTerm,
        selectedSemester,
        selectedSection,
        menteeSemester: mentee.semester,
        menteeSection: mentee.section,
        matchesSearch,
        matchesSemester,
        matchesSection,
        isIncluded
      });
    }
    
    return isIncluded;
  });

  // Debug logging for filtered results
  console.log('Filtered mentees:', filteredMentees.length, 'out of', menteesWithData.length);
  console.log('Current filter values:', {
    searchTerm,
    selectedSemester,
    selectedSection,
    academicYear
  });
  console.log('All mentees data:', menteesWithData.map(m => ({
    name: m.name,
    usn: m.usn,
    semester: m.semester,
    section: m.section
  })));

  // Get unique semesters and sections for filters
  const semesters = Array.from(new Set(mentees?.map(m => m.semester) || [])).sort();
  const sections = Array.from(new Set(mentees?.map(m => m.section) || [])).sort();

  // Calculate statistics based on filtered mentees
  const totalMentees = filteredMentees.length;
  const atRiskMentees = filteredMentees.filter(m => m.attendance !== undefined && m.attendance < 85).length;
  const averageAttendance = filteredMentees.length > 0 
    ? filteredMentees.reduce((sum, m) => sum + (m.attendance || 0), 0) / filteredMentees.length 
    : 0;
  const averageMarks = filteredMentees.length > 0
    ? filteredMentees.reduce((sum, m) => sum + m.averageMarks, 0) / filteredMentees.length
    : 0;

  const exportToCSV = () => {
    const headers = [
      "Name", "USN", "Email", "Semester", "Section", "Mobile", "Parent Mobile",
      "Average Attendance", "Average Marks", "Overall Grade", 
      "Total Subjects", "Passed Subjects", "Failed Subjects",
      "Subject Details"
    ];
    
    const csvData = filteredMentees.map(mentee => {
      // Create detailed subject information
      const subjectDetails = mentee.academicRecords.map(record => {
        const grade = record.totalMarks ? calculateGrade(record.totalMarks, record.avgCieMarks || undefined, record.assignmentMarks || undefined) : "N/A";
        return `${record.subject?.code || 'N/A'}: ${record.totalMarks?.toFixed(1) || 'N/A'}/50 (${grade})`;
      }).join("; ");

      return [
        mentee.name || "N/A",
        mentee.usn,
        mentee.email || "N/A",
        mentee.semester,
        mentee.section,
        mentee.mobileNumber || "N/A",
        mentee.parentMobileNumber || "N/A",
        mentee.attendance?.toFixed(1) + "%" || "N/A",
        mentee.averageMarks.toFixed(1) || "N/A",
        mentee.overallGrade,
        mentee.totalSubjects,
        mentee.passedSubjects,
        mentee.failedSubjects,
        subjectDetails || "No records"
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mentees-data-${academicYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout 
      pageTitle="Data Export" 
      pageDescription="Export comprehensive mentee data with attendance and performance information"
    >
      <div className="space-y-6">
        {/* Filters and Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Controls
              {(searchTerm || selectedSemester !== "all" || selectedSection !== "all") && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Active Filters
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-mentees"
                    name="search-mentees"
                    placeholder="Search mentees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Semester</label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="All semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map(sem => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Section</label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(section => (
                      <SelectItem key={section} value={section}>
                        Section {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Academic Year</label>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Actions</label>
                <div className="flex gap-2">
                  <Button onClick={exportToCSV} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedSemester("all");
                      setSelectedSection("all");
                    }} 
                    variant="outline" 
                    size="icon"
                    title="Clear all filters"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="rounded-full bg-primary-100 p-3 mr-4">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {filteredMentees.length !== menteesWithData.length ? 'Filtered Mentees' : 'Total Mentees'}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{totalMentees}</p>
                  {filteredMentees.length !== menteesWithData.length && (
                    <p className="text-xs text-muted-foreground">of {menteesWithData.length} total</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="rounded-full bg-red-100 p-3 mr-4">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">At-Risk Mentees</p>
                  <p className="text-2xl font-bold text-foreground">{atRiskMentees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-3 mr-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                  <p className="text-2xl font-bold text-foreground">
                    {averageAttendance.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-3 mr-4">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Marks</p>
                  <p className="text-2xl font-bold text-foreground">
                    {averageMarks.toFixed(1)}/50
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Export Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Mentees Data for Export</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing {filteredMentees.length} of {menteesWithData.length} mentees</span>
                {(searchTerm || selectedSemester !== "all" || selectedSection !== "all") && (
                  <Badge variant="outline" className="text-xs">
                    Filtered
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {academicYear} Data
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Loading State */}
            {(isMenteesLoading || isRecordsLoading) ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                  <p className="text-muted-foreground">Loading mentee data...</p>
                </div>
              </div>
            ) : recordsError ? (
              <div className="text-center py-10">
                <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Data</h3>
                <p className="text-muted-foreground">
                  {recordsError.message || "Failed to load mentee data. Please try again."}
                </p>
              </div>
            ) : filteredMentees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>USN</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Avg Marks</TableHead>
                      <TableHead>Overall Grade</TableHead>
                      <TableHead>Total Subjects</TableHead>
                      <TableHead>Passed</TableHead>
                      <TableHead>Failed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMentees.map((mentee) => {
                      const attendanceStatus = mentee.attendance !== undefined 
                        ? getAttendanceStatus(mentee.attendance) 
                        : null;
                      const StatusIcon = attendanceStatus?.icon || CheckCircle;
                      
                      return (
                        <TableRow key={mentee.id}>
                          <TableCell className="font-medium">
                            {mentee.name || "N/A"}
                          </TableCell>
                          <TableCell>
                            <code className="px-2 py-1 bg-muted rounded text-sm">
                              {mentee.usn}
                            </code>
                          </TableCell>
                          <TableCell>{mentee.email || "N/A"}</TableCell>
                          <TableCell>Sem {mentee.semester}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{mentee.section}</Badge>
                          </TableCell>
                          <TableCell>{mentee.mobileNumber || "N/A"}</TableCell>
                          <TableCell>
                            {mentee.attendance !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{mentee.attendance.toFixed(1)}%</span>
                                <div className="w-12 bg-neutral-100 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      mentee.attendance >= 85 ? 'bg-green-500' : 
                                      mentee.attendance >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(mentee.attendance, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {mentee.averageMarks > 0 ? (
                              <span className="font-medium">{mentee.averageMarks.toFixed(1)}/50</span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getGradeColor(mentee.overallGrade)} font-medium`}>
                              {mentee.overallGrade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{mentee.totalSubjects}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-green-600 font-medium">{mentee.passedSubjects}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-red-600 font-medium">{mentee.failedSubjects}</span>
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
                <h3 className="text-lg font-semibold mb-2">No mentees found</h3>
                <p className="text-muted-foreground">
                  {menteesWithData.length === 0 
                    ? `No mentees have academic records for ${academicYear}. Try selecting a different academic year.`
                    : "No mentees match the current filters. Try adjusting your search criteria."
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
