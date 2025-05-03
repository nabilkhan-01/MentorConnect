import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Defining the form schema
const academicRecordSchema = z.object({
  subjectId: z.coerce.number({
    required_error: "Subject is required",
    invalid_type_error: "Subject must be selected",
  }),
  cieMarks: z.coerce.number().min(0, "CIE marks cannot be negative").max(50, "CIE marks cannot exceed 50"),
  assignmentMarks: z.coerce.number().min(0, "Assignment marks cannot be negative").max(50, "Assignment marks cannot exceed 50"),
  totalMarks: z.coerce.number().min(0, "Total marks cannot be negative").max(100, "Total marks cannot exceed 100"),
  attendance: z.coerce.number().min(0, "Attendance cannot be negative").max(100, "Attendance cannot exceed 100%"),
  semester: z.coerce.number().min(1, "Semester must be at least 1").max(8, "Semester cannot be more than 8"),
  academicYear: z.string().min(4, "Academic year is required"),
});

type AcademicRecordFormValues = z.infer<typeof academicRecordSchema>;

type Subject = {
  id: number;
  code: string;
  name: string;
  semester: number;
};

type AcademicFormProps = {
  mentee: {
    id: number;
    name?: string;
    usn?: string;
    semester?: number;
  };
  onSubmit: (data: AcademicRecordFormValues) => void;
  isSubmitting?: boolean;
};

const currentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // If it's after June, use current year and next year, otherwise use previous year and current year
  return month >= 6 
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
};

export function AcademicForm({
  mentee,
  onSubmit,
  isSubmitting = false,
}: AcademicFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("attendance");
  
  // Fetch subjects
  const { data: subjects, isLoading: isSubjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  
  // Filter subjects by semester
  const filteredSubjects = subjects?.filter(
    (subject) => subject.semester === mentee.semester
  ) || [];
  
  const form = useForm<AcademicRecordFormValues>({
    resolver: zodResolver(academicRecordSchema),
    defaultValues: {
      subjectId: undefined,
      cieMarks: 0,
      assignmentMarks: 0,
      totalMarks: 0,
      attendance: 0,
      semester: mentee.semester || 1,
      academicYear: currentAcademicYear(),
    }
  });
  
  // Calculate total marks when CIE or assignment marks change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'cieMarks' || name === 'assignmentMarks') {
        const cieMarks = Number(value.cieMarks) || 0;
        const assignmentMarks = Number(value.assignmentMarks) || 0;
        form.setValue('totalMarks', cieMarks + assignmentMarks);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  const handleSubmit = (values: AcademicRecordFormValues) => {
    onSubmit(values);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="marks">Marks & Grades</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                      </FormControl>
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
                          <SelectItem value="none">No subjects available for this semester</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select academic year" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <TabsContent value="attendance" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="attendance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attendance Percentage</FormLabel>
                        <div className="flex items-center gap-4">
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              min={0}
                              max={100}
                              step={0.1}
                              className="w-32"
                            />
                          </FormControl>
                          <span>%</span>
                          <div className="flex-1">
                            <div className="w-full bg-neutral-100 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  Number(field.value) < 85 ? 'bg-red-500' : 'bg-green-500'
                                }`} 
                                style={{ width: `${Math.min(Number(field.value), 100)}%` }}
                              ></div>
                            </div>
                            {Number(field.value) < 85 && (
                              <p className="text-xs text-red-500 mt-1">
                                This student is at risk due to low attendance
                              </p>
                            )}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="marks" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cieMarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CIE Marks</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                min={0}
                                max={50}
                                step={0.5}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">/ 50</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="assignmentMarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignment Marks</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                min={0}
                                max={50}
                                step={0.5}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">/ 50</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="totalMarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Marks</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input 
                              type="number"
                              {...field}
                              readOnly
                              className="bg-neutral-50"
                            />
                          </FormControl>
                          <span className="text-sm text-muted-foreground">/ 100</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Automatically calculated from CIE and Assignment marks
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Academic Records
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default AcademicForm;
