import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, BookOpen, Phone, Calendar, CircleAlert } from "lucide-react";
import { Mentee } from "@shared/schema";

type StudentDetailsDialogProps = {
  student: Partial<Mentee & { 
    name?: string, 
    email?: string, 
    attendance?: number, 
    atRisk?: boolean, 
    mentorName?: string,
    isActive?: boolean,
    createdAt?: Date,
    updatedAt?: Date
  }> | null;
  isOpen: boolean;
  onClose: () => void;
};

export function StudentDetailsDialog({ student, isOpen, onClose }: StudentDetailsDialogProps) {
  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Details
          </DialogTitle>
          <DialogDescription>
            Complete information about the selected student
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-sm font-medium">{student.name || "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">USN</label>
                <p className="text-sm font-medium">{student.usn}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm font-medium">{student.email || "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={student.isActive !== false ? "default" : "secondary"}>
                  {student.isActive !== false ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Academic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Academic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Current Semester</label>
                <p className="text-sm font-medium">Semester {student.semester}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Section</label>
                <p className="text-sm font-medium">{student.section}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Current Attendance</label>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${(student.attendance || 0) < 85 
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800' 
                      : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800'}`}
                  >
                    {(student.attendance || 0).toFixed(1)}%
                  </Badge>
                  {(student.attendance || 0) < 85 && (
                    <Badge variant="destructive" className="text-xs">
                      At Risk
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Assigned Mentor</label>
                <p className="text-sm font-medium">{student.mentorName || "Not assigned"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Student Mobile</label>
                <p className="text-sm font-medium">{student.mobileNumber || "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Parent Mobile</label>
                <p className="text-sm font-medium">{student.parentMobileNumber || "Not provided"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Risk Assessment */}
          {(student.attendance || 0) < 85 && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CircleAlert className="h-4 w-4" />
                  Risk Assessment
                </h3>
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200">Attendance Below Threshold</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        This student's attendance of {(student.attendance || 0).toFixed(1)}% is below the required 85% threshold. 
                        Immediate attention and intervention may be necessary to prevent academic complications.
                      </p>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-red-600 dark:text-red-400">
                          <strong>Recommended Actions:</strong>
                        </p>
                        <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 ml-4">
                          <li>• Contact the student to discuss attendance issues</li>
                          <li>• Schedule a meeting with the assigned mentee</li>
                          <li>• Review academic performance and provide support</li>
                          <li>• Consider additional academic resources or counseling</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
