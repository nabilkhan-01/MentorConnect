import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Mentor, Mentee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Defining the form schema
const studentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  usn: z.string().min(5, "USN must be at least 5 characters"),
  email: z.string().email("Please enter a valid email"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  parentMobileNumber: z.string().min(10, "Parent mobile number must be at least 10 digits"),
  semester: z.coerce.number().min(1).max(8),
  section: z.string().min(1, "Section is required"),
  mentorId: z.coerce.number().optional(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

type StudentFormProps = {
  onSubmit: (data: StudentFormValues) => void;
  initialValues?: Partial<StudentFormValues>;
  isSubmitting?: boolean;
  mode?: "add" | "edit";
};

export function StudentForm({
  onSubmit,
  initialValues = {},
  isSubmitting = false,
  mode = "add",
}: StudentFormProps) {
  const { toast } = useToast();
  
  const { data: mentors, isLoading: isMentorsLoading } = useQuery<Mentor[]>({
    queryKey: ["/api/mentors"],
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      usn: "",
      email: "",
      mobileNumber: "",
      parentMobileNumber: "",
      semester: 1,
      section: "",
      mentorId: undefined,
      ...initialValues
    }
  });

  const handleSubmit = (values: StudentFormValues) => {
    onSubmit(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "add" ? "Add New Student" : "Edit Student"}</CardTitle>
        <CardDescription>
          {mode === "add" 
            ? "Enter the details to add a new student to the system." 
            : "Update the student's information."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="usn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>USN</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter USN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parentMobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent's Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter parent's mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <Select 
                      value={field.value.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                          <SelectItem key={semester} value={semester.toString()}>
                            Semester {semester}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter section (e.g., A, B, C)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mentorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Mentor</FormLabel>
                    <Select 
                      value={field.value?.toString() || ""} 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a mentor" />
                      </SelectTrigger>
                      <SelectContent>
                        {isMentorsLoading ? (
                          <SelectItem value="loading">Loading mentors...</SelectItem>
                        ) : mentors?.length ? (
                          mentors.map((mentor) => (
                            <SelectItem key={mentor.id} value={mentor.id.toString()}>
                              {mentor.user?.name || `Mentor ID: ${mentor.id}`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none">No mentors available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "add" ? "Add Student" : "Update Student"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default StudentForm;
