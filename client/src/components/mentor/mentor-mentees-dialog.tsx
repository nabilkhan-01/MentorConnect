import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Users, User, Mail, Phone, Calendar, BookOpen } from "lucide-react";

type MenteeWithDetails = {
  id: number;
  userId: number;
  usn: string;
  semester: number;
  section: string;
  mobileNumber?: string;
  parentMobileNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  name?: string;
  email?: string;
};

type MentorMenteesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  mentor: {
    id: number;
    name?: string;
    email?: string;
    department?: string;
  } | null;
};

export function MentorMenteesDialog({ isOpen, onClose, mentor }: MentorMenteesDialogProps) {
  // Fetch mentees for the selected mentor
  const { data: mentees, isLoading, error } = useQuery<MenteeWithDetails[]>({
    queryKey: [`/api/mentors/${mentor?.id}/mentees`],
    enabled: isOpen && !!mentor?.id,
  });

  // Debug logging
  console.log('MentorMenteesDialog:', { 
    isOpen, 
    mentorId: mentor?.id, 
    isLoading, 
    error: error?.message,
    mentees: mentees?.length 
  });

  if (!mentor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mentees under {mentor.name || 'Mentor'}
          </DialogTitle>
          <DialogDescription>
            {mentor.department && (
              <span className="text-sm text-muted-foreground">
                Department: {mentor.department}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-muted-foreground">Loading mentees...</p>
              </div>
            </div>
          ) : error ? (
            <Card className="p-6 text-center">
              <p className="text-destructive">Failed to load mentees. Please try again.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Error: {error.message}
              </p>
            </Card>
          ) : mentees && mentees.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Total mentees: {mentees.length}</span>
                </div>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>USN</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mentees.map((mentee) => (
                        <TableRow key={mentee.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {mentee.name || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="px-2 py-1 bg-muted rounded text-sm">
                              {mentee.usn}
                            </code>
                          </TableCell>
                          <TableCell>
                            {mentee.email ? (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{mentee.email}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3 text-muted-foreground" />
                              <span>{mentee.semester}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {mentee.section}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {mentee.mobileNumber ? (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{mentee.mobileNumber}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={mentee.isActive ? "default" : "secondary"}
                              className={mentee.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                            >
                              {mentee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{mentees.length}</div>
                  <div className="text-sm text-muted-foreground">Total Mentees</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {mentees.filter(m => m.isActive).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {new Set(mentees.map(m => m.semester)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Semesters</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(mentees.map(m => m.section)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Sections</div>
                </Card>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No mentees assigned</h3>
              <p className="text-muted-foreground">
                This mentor doesn't have any mentees assigned yet.
              </p>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MentorMenteesDialog;
