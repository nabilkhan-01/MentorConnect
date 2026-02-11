import React, { useState } from 'react';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ExcelUpload from "@/components/admin/excel-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Download, Users, UserPlus, Shuffle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDataImportPage() {
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{ success: boolean; message: string; result?: { assignedCount: number; mentorCount: number } } | null>(null);

  // Handle successful mentor upload
  const handleMentorUploadSuccess = () => {
    // Invalidate all related queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
    queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
  };

  // Handle successful mentee upload
  const handleMenteeUploadSuccess = () => {
    // Invalidate all related queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/at-risk-students"] });
    queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
    queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
    queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
  };

  // Download sample templates
  const handleDownloadMentorTemplate = () => {
    // Create CSV content for mentor template
    const csvContent = "Name,Email,Department,Specialization,MobileNumber\nDr John Smith,john@example.edu,CSE,Professor,9876543210\nDr Jane Doe,jane@example.edu,CSE,Associate Professor,9876543211";
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "mentor_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadMenteeTemplate = () => {
    // Create CSV content for mentee template
    const csvContent = "Name,Email,USN,Semester,Section,MobileNumber,MentorUsername\n" +
      "Alex,alex@example.edu,4SF23CS123,5,B,9876543212,mentor\n" +
      "Sam,sam@example.edu,4SF23CS042,5,B,9876543213,mentor";
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "mentee_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle balanced reassignment of mentees
  const handleBalancedAssignment = async () => {
    setIsAssigning(true);
    setAssignmentResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/admin/reassign-mentees");
      const result = await response.json();
      
      setAssignmentResult(result);
      
      if (result.success) {
        toast({
          title: "Reassignment successful",
          description: result.message,
        });
        
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/mentor/mentees"] });
        queryClient.invalidateQueries({ queryKey: ["/api/mentor/dashboard/stats"] });
      } else {
        toast({
          title: "Reassignment error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Reassignment error:", error);
      toast({
        title: "Reassignment failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Data Import" pageDescription="Import data from Excel files">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Excel Data Import</CardTitle>
            <CardDescription>
              Upload Excel files to import mentors and mentees data into the system.
              The system will automatically create user accounts and assign mentees to mentors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Download Templates</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download sample templates to see the required format for your Excel files.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadMentorTemplate}
                      className="w-full sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Mentor Template
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadMenteeTemplate}
                      className="w-full sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Mentee Template
                    </Button>
                  </div>
                </div>
              </div>
              
              <Tabs defaultValue="mentees" className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                  <TabsTrigger value="mentees">
                    <Users className="mr-2 h-4 w-4" /> 
                    Mentees
                  </TabsTrigger>
                  <TabsTrigger value="mentors">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Mentors
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="mentees" className="pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <ExcelUpload
                      title="Upload Mentees"
                      description="Upload an Excel file containing mentee information. The system will automatically create user accounts and assign mentees to mentors."
                      apiEndpoint="/api/admin/upload/mentees"
                      onSuccess={handleMenteeUploadSuccess}
                    />
                    <Card>
                      <CardHeader>
                        <CardTitle>Instructions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                          <li>Prepare your Excel file with the following columns: <strong>Name</strong>, <strong>Email</strong>, <strong>USN</strong>, <strong>Semester</strong>, <strong>Section</strong>, <strong>Batch</strong>, <strong>MobileNumber</strong>, <strong>MentorUsername</strong> (optional).</li>
                          <li>The <strong>USN</strong> and <strong>Name</strong> fields are required.</li>
                          <li>If <strong>MentorUsername</strong> is provided, the mentee will be assigned to that mentor. Otherwise, mentees will be automatically assigned with balanced distribution.</li>
                          <li>Mentor usernames are normalized automatically: spaces become dots and non-alphanumeric characters are removed (e.g., "Dr John Smith" → <code>dr.john</code>).</li>
                          <li>The system will create user accounts with the USN as username and initial password.</li>
                          <li>If a mentee with the same USN already exists, their information will be updated.</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="mentors" className="pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <ExcelUpload
                      title="Upload Mentors"
                      description="Upload an Excel file containing mentor information. The system will automatically create user accounts for new mentors."
                      apiEndpoint="/api/admin/upload/mentors"
                      onSuccess={handleMentorUploadSuccess}
                    />
                    <Card>
                      <CardHeader>
                        <CardTitle>Instructions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                          <li>Prepare your Excel file with the following columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Department</strong>, <strong>Specialization</strong>, <strong>MobileNumber</strong>.</li>
                          <li>The <strong>Name</strong> and <strong>Department</strong> fields are required.</li>
                          <li><strong>Email</strong>, <strong>Specialization</strong>, and <strong>MobileNumber</strong> are optional.</li>
                          <li>The system will automatically generate a username from the mentor's name (e.g., "Dr. John Smith" becomes "dr.john").</li>
                          <li>The initial password will be set to the username.</li>
                          <li>If a mentor with the same username already exists, their information will be updated.</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
