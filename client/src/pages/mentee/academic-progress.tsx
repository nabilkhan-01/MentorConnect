import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp, TrendingDown, BookOpen, Calendar, AlertTriangle } from "lucide-react";
import { isAtRisk } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6B66FF'];

type MarkDistribution = {
  range: string;
  count: number;
};

type SubjectPerformance = {
  name: string;
  marks: number;
  attendance: number;
};

export default function AcademicProgressPage() {
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  
  // Fetch academic records
  const { user } = useAuth();
  
  const { data: academicRecords, isLoading: isAcademicLoading } = useQuery<AcademicRecord[]>({
    queryKey: ["/api/mentee/academic-records", user?.id],
    enabled: !!user?.id,
  });

  // Filter records by selected semester
  const filteredRecords = academicRecords?.filter(record => {
    if (selectedSemester === 'all') return true;
    return record.semester.toString() === selectedSemester;
  }) || [];

  // Get unique semesters from records
  const recordedSemesters = academicRecords 
    ? Array.from(new Set(academicRecords.map(record => record.semester))).sort((a, b) => a - b)
    : [];

  // Get current semester (assuming student is in their current semester)
  // If no records exist, default to semester 1
  const currentSemester = recordedSemesters.length > 0 ? Math.max(...recordedSemesters) : 1;
  
  // Generate all semesters from 1 to current semester
  const allSemesters = Array.from({ length: currentSemester }, (_, i) => i + 1);

  // Calculate metrics
  const calculateAverageMarks = () => {
    if (!filteredRecords.length) return 0;
    return filteredRecords.reduce((sum, record) => sum + (record.totalMarks && record.totalMarks !== null ? record.totalMarks : 0), 0) / filteredRecords.length;
  };

  const calculateAverageAttendance = () => {
    if (!filteredRecords.length) return 0;
    return filteredRecords.reduce((sum, record) => sum + (record.attendance && record.attendance !== null ? record.attendance : 0), 0) / filteredRecords.length;
  };

  const calculateHighestMarks = () => {
    if (!filteredRecords.length) return { subject: '', marks: 0 };
    const highestRecord = [...filteredRecords].sort((a, b) => (b.totalMarks && b.totalMarks !== null ? b.totalMarks : 0) - (a.totalMarks && a.totalMarks !== null ? a.totalMarks : 0))[0];
    return {
      subject: highestRecord.subject.name,
      marks: highestRecord.totalMarks && highestRecord.totalMarks !== null ? highestRecord.totalMarks : 0
    };
  };

  const calculateLowestMarks = () => {
    if (!filteredRecords.length) return { subject: '', marks: 0 };
    const lowestRecord = [...filteredRecords].sort((a, b) => (a.totalMarks && a.totalMarks !== null ? a.totalMarks : 0) - (b.totalMarks && b.totalMarks !== null ? b.totalMarks : 0))[0];
    return {
      subject: lowestRecord.subject.name,
      marks: lowestRecord.totalMarks && lowestRecord.totalMarks !== null ? lowestRecord.totalMarks : 0
    };
  };

  const calculateMarksDistribution = (): MarkDistribution[] => {
    if (!filteredRecords.length) return [];
    
    const ranges = [
      { range: '91-100', min: 91, max: 100, count: 0 },
      { range: '81-90', min: 81, max: 90, count: 0 },
      { range: '71-80', min: 71, max: 80, count: 0 },
      { range: '61-70', min: 61, max: 70, count: 0 },
      { range: '51-60', min: 51, max: 60, count: 0 },
      { range: '41-50', min: 41, max: 50, count: 0 },
      { range: '0-40', min: 0, max: 40, count: 0 },
    ];
    
    filteredRecords.forEach(record => {
      const marks = record.totalMarks && record.totalMarks !== null ? record.totalMarks : 0;
      const range = ranges.find(r => marks >= r.min && marks <= r.max);
      if (range) range.count++;
    });
    
    return ranges.filter(r => r.count > 0);
  };

  const prepareSubjectPerformanceData = (): SubjectPerformance[] => {
    // Group records by subject and calculate averages if multiple records exist
    const subjectMap = new Map<string, { marks: number[], name: string }>();
    
    filteredRecords.forEach(record => {
      const subjectCode = record.subject.code;
      const subjectName = record.subject.name;
      
      if (!subjectMap.has(subjectCode)) {
        subjectMap.set(subjectCode, { marks: [], name: subjectName });
      }
      
      const subject = subjectMap.get(subjectCode)!;
      const totalMarks = record.totalMarks && record.totalMarks !== null ? record.totalMarks : 0;
      subject.marks.push(totalMarks);
    });
    
    // Convert to array and calculate averages
    return Array.from(subjectMap.entries()).map(([code, data]) => ({
      name: code, // Use subject code for X-axis
      marks: data.marks.reduce((sum, mark) => sum + mark, 0) / data.marks.length,
      attendance: 0, // Keep for type compatibility but not used
    })).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically for consistency
  };

  // Calculate metrics
  const averageMarks = calculateAverageMarks();
  const averageAttendance = calculateAverageAttendance();
  const highestMarks = calculateHighestMarks();
  const lowestMarks = calculateLowestMarks();
  const marksDistribution = calculateMarksDistribution();
  const subjectPerformanceData = prepareSubjectPerformanceData();
  
  // Check if student is at risk
  const isAtRiskStudent = averageAttendance < 85;

  return (
    <DashboardLayout 
      pageTitle="Academic Progress" 
      pageDescription="Track and analyze your academic performance"
    >
      <div className="flex justify-end mb-4">
        <div className="w-full sm:w-48">
          <Select
            value={selectedSemester}
            onValueChange={setSelectedSemester}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {allSemesters.map((semester) => (
                <SelectItem key={semester} value={semester.toString()}>
                  Semester {semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isAcademicLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !academicRecords?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium text-center">No Academic Records Found</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              There are no academic records available to display at this time. Records will appear here once they are added to the system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Marks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageMarks.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedSemester === 'all' ? 'Across all semesters' : `In semester ${selectedSemester}`}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="text-2xl font-bold mr-2">
                    {averageAttendance.toFixed(1)}%
                  </div>
                  {isAtRiskStudent && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      At Risk
                    </Badge>
                  )}
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${isAtRiskStudent ? 'bg-red-500' : 'bg-green-500'}`} 
                    style={{ width: `${Math.min(averageAttendance, 100)}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Highest Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                  <div className="text-2xl font-bold">
                    {highestMarks.marks.toFixed(1)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate" title={highestMarks.subject}>
                  {highestMarks.subject}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Lowest Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
                  <div className="text-2xl font-bold">
                    {lowestMarks.marks.toFixed(1)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate" title={lowestMarks.subject}>
                  {lowestMarks.subject}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subject-wise Performance</CardTitle>
                <CardDescription>
                  Compare your performance across different subjects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectPerformanceData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        fontSize={12}
                      />
                      <YAxis domain={[0, 50]} />
                      <Tooltip 
                        formatter={(value) => {
                          const numericValue = typeof value === "number" ? value : Number(value);
                          const label = Number.isFinite(numericValue)
                            ? `${numericValue.toFixed(1)}/50`
                            : `${String(value)}/50`;
                          return [label, "Marks"];
                        }}
                        labelFormatter={(label) => `Subject: ${label}`}
                      />
                      <Bar dataKey="marks" name="Marks (out of 50)" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Marks Distribution</CardTitle>
                <CardDescription>
                  Distribution of your marks across different ranges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={marksDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="range"
                      >
                        {marksDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} subjects`, `${props.payload.range}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Academic Records</CardTitle>
              <CardDescription>
                Subject-wise breakdown of your academic performance
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-2">
              <div className="bg-blue-50 p-4 rounded-md mb-4">
                <h4 className="text-sm font-medium text-blue-800">Understanding Your Academic Records</h4>
                <div className="mt-1 text-xs text-blue-700 space-y-1">
                  <p>• <strong>CIE 1, 2, 3</strong>: Individual Continuous Internal Evaluation marks (out of 10 each)</p>
                  <p>• <strong>Avg CIE</strong>: Average of your three CIE marks (out of 30)</p>
                  <p>• <strong>Assignment</strong>: Assignment score (out of 20)</p>
                  <p>• <strong>Total Marks</strong>: Combined score (Average CIE + Assignment = max 50)</p>
                </div>
              </div>
            </div>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Code</TableHead>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>CIE 1</TableHead>
                      <TableHead>CIE 2</TableHead>
                      <TableHead>CIE 3</TableHead>
                      <TableHead>Avg CIE</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Academic Year</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.subject.code}</TableCell>
                        <TableCell>{record.subject.name}</TableCell>
                        <TableCell>{record.semester}</TableCell>
                        <TableCell>{record.cie1Marks !== undefined && record.cie1Marks !== null ? record.cie1Marks.toFixed(1) : "-"}</TableCell>
                        <TableCell>{record.cie2Marks !== undefined && record.cie2Marks !== null ? record.cie2Marks.toFixed(1) : "-"}</TableCell>
                        <TableCell>{record.cie3Marks !== undefined && record.cie3Marks !== null ? record.cie3Marks.toFixed(1) : "-"}</TableCell>
                        <TableCell>{record.avgCieMarks !== undefined && record.avgCieMarks !== null ? record.avgCieMarks.toFixed(1) : "-"}</TableCell>
                        <TableCell>{record.assignmentMarks !== undefined && record.assignmentMarks !== null ? record.assignmentMarks.toFixed(1) : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={record.totalMarks && record.totalMarks < 20 ? "destructive" : "outline"}
                            className={record.totalMarks && record.totalMarks >= 40 ? "bg-green-50 text-green-700 border-green-200" : ""}>
                            {record.totalMarks !== null && record.totalMarks !== undefined ? record.totalMarks.toFixed(1) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.attendance !== undefined && record.attendance !== null ? (
                            <Badge variant="outline" className={`${isAtRisk(record.attendance) 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : 'bg-green-50 text-green-700 border-green-200'}`}>
                              {record.attendance.toFixed(1)}%
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{record.academicYear}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Warning for At-Risk students */}
          {isAtRiskStudent && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-start space-x-4 pt-6 pb-6">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Attendance Warning</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Your overall attendance is below 85%, which places you at risk. Please focus on improving your attendance to avoid academic complications.
                    Consider discussing this with your mentor for guidance and support.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Improvement Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Improvement Tips</CardTitle>
              <CardDescription>
                Personalized suggestions based on your performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowestMarks.marks < 60 && (
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <BookOpen className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Focus on {lowestMarks.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your performance in {lowestMarks.subject} could use improvement. Consider allocating more study time to this subject or seeking additional help from your mentor or subject instructor.
                      </p>
                    </div>
                  </div>
                )}
                
                {isAtRiskStudent && (
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                      <Calendar className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Attendance Improvement Needed</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your current attendance level of {averageAttendance.toFixed(1)}% is below the required minimum. Make attending classes a priority to avoid academic complications.
                      </p>
                    </div>
                  </div>
                )}
                
                {averageMarks < 60 && (
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">General Performance Improvement</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your overall performance could benefit from improved study habits and time management. Consider creating a study schedule and seeking additional resources to supplement your learning.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Always show this general advice */}
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <BookOpen className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Balanced Approach to Learning</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      While focusing on areas that need improvement, don't neglect your strengths. Continue to excel in {highestMarks.subject} while working on improving other areas.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
