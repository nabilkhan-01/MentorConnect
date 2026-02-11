import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, BookOpen, GraduationCap, User, Phone, Mail, School, AlertTriangle } from "lucide-react";
import { formatPhoneNumber, isAtRisk } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type MenteeProfile = {
  mentee: {
    id: number;
    usn: string;
    semester: number;
    section: string;
    mobileNumber?: string;
    parentMobileNumber?: string;
    name?: string;
    email?: string;
  };
  mentor: {
    id: number;
    department?: string;
    specialization?: string;
    mobileNumber?: string;
    name?: string;
    email?: string;
  } | null;
};

type AcademicRecord = {
  id: number;
  menteeId: number;
  subjectId: number;
  cie1Marks?: number;
  cie2Marks?: number;
  cie3Marks?: number;
  avgCieMarks?: number;
  assignmentMarks?: number;
  totalMarks?: number;
  attendance?: number;
  semester: number;
  academicYear: string;
  subject: {
    id: number;
    code: string;
    name: string;
    semester: number;
  };
};

export default function MenteeDashboard() {
  const { user } = useAuth();
  
  // Fetch mentee profile and academic data
  const { data: profileData, isLoading: isProfileLoading } = useQuery<MenteeProfile>({
    queryKey: ["/api/mentee/profile", user?.id],
    enabled: !!user?.id,
  });
  
  const { data: academicRecords, isLoading: isAcademicLoading } = useQuery<AcademicRecord[]>({
    queryKey: ["/api/mentee/academic-records", user?.id],
    enabled: !!user?.id,
  });
  
  // Calculate overall attendance
  const overallAttendance = academicRecords?.length
    ? academicRecords.reduce((sum, record) => sum + (record.attendance && record.attendance !== null ? record.attendance : 0), 0) / academicRecords.length
    : undefined;
  
  // Calculate average marks
  const averageMarks = academicRecords?.length
    ? academicRecords.reduce((sum, record) => sum + (record.totalMarks && record.totalMarks !== null ? record.totalMarks : 0), 0) / academicRecords.length
    : undefined;
  
  // Check if student is at risk
  const isAtRiskStudent = overallAttendance !== undefined && overallAttendance < 85;
  
  return (
    <DashboardLayout 
      pageTitle="My Dashboard" 
      pageDescription="View your academic records and performance"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Profile Summary Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Profile Summary</CardTitle>
            <CardDescription>Your personal and academic information</CardDescription>
          </CardHeader>
          <CardContent>
            {isProfileLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : profileData ? (
              <div className="space-y-6">
                {/* Student Info Section */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Student Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{profileData.mentee.name}</p>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <School className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{profileData.mentee.usn}</p>
                        <p className="text-xs text-muted-foreground">USN</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{profileData.mentee.email || "Not provided"}</p>
                        <p className="text-xs text-muted-foreground">Email</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{formatPhoneNumber(profileData.mentee.mobileNumber) || "Not provided"}</p>
                        <p className="text-xs text-muted-foreground">Mobile Number</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <GraduationCap className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Semester {profileData.mentee.semester}, Section {profileData.mentee.section}</p>
                        <p className="text-xs text-muted-foreground">Current Academic Status</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{formatPhoneNumber(profileData.mentee.parentMobileNumber) || "Not provided"}</p>
                        <p className="text-xs text-muted-foreground">Parent's Mobile Number</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mentor Info Section */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Mentor Information</h3>
                  {profileData.mentor ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{profileData.mentor.name}</p>
                          <p className="text-xs text-muted-foreground">Mentor Name</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{profileData.mentor.email || "Not provided"}</p>
                          <p className="text-xs text-muted-foreground">Email</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{profileData.mentor.department || "Not specified"}</p>
                          <p className="text-xs text-muted-foreground">Department</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{formatPhoneNumber(profileData.mentor.mobileNumber) || "Not provided"}</p>
                          <p className="text-xs text-muted-foreground">Mobile Number</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No mentor assigned yet</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Failed to load profile data
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Academic Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Academic Summary</CardTitle>
            <CardDescription>Your current academic performance</CardDescription>
          </CardHeader>
          <CardContent>
            {isAcademicLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : academicRecords?.length ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Overall Attendance</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{overallAttendance?.toFixed(1)}%</span>
                        {isAtRiskStudent && (
                          <span className="text-sm text-red-500 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" /> At Risk
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${isAtRiskStudent ? 'bg-red-500' : 'bg-green-500'}`} 
                          style={{ width: `${overallAttendance}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Average Marks</h3>
                  <div className="text-2xl font-bold">
                    {averageMarks?.toFixed(1)}
                    <span className="text-sm font-normal text-muted-foreground"> / 50</span>
                  </div>
                  
                  <div className="pt-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Academic Year</h3>
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm">{academicRecords[0]?.academicYear}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No academic records found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Academic Records Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Academic Records</CardTitle>
          <CardDescription>Detailed view of your subject-wise performance</CardDescription>
        </CardHeader>
        <CardContent>
          {isAcademicLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : academicRecords?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Avg CIE</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.subject.code}</TableCell>
                      <TableCell>{record.subject.name}</TableCell>
                      <TableCell>{record.avgCieMarks !== undefined && record.avgCieMarks !== null ? record.avgCieMarks.toFixed(1) : "-"} / 30</TableCell>
                      <TableCell>{record.assignmentMarks !== undefined && record.assignmentMarks !== null ? record.assignmentMarks.toFixed(1) : "-"} / 20</TableCell>
                      <TableCell className="font-medium">{record.totalMarks !== undefined && record.totalMarks !== null ? record.totalMarks.toFixed(1) : "-"} / 50</TableCell>
                      <TableCell>
                        {record.attendance !== undefined && record.attendance !== null ? (
                          <Badge variant="outline" className={`${
                            record.attendance < 85 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {record.attendance.toFixed(1)}%
                          </Badge>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No academic records found
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* If student is at risk, show warning */}
      {isAtRiskStudent && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardContent className="flex items-start space-x-4 pt-6 pb-6">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Attendance Warning</h3>
              <p className="text-sm text-red-700 mt-1">
                Your overall attendance is below 85%, which places you at risk. Please focus on improving your attendance to avoid academic complications.
                Consider contacting your mentor for guidance and support.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
