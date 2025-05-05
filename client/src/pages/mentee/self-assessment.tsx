import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Save } from "lucide-react";

// Define the schema for the self-assessment form
const selfAssessmentSchema = z.object({
  academicGoals: z.string().min(10, "Academic goals must be at least 10 characters"),
  careerAspirations: z.string().min(10, "Career aspirations must be at least 10 characters"),
  strengths: z.string().min(5, "Strengths must be at least 5 characters"),
  areasToImprove: z.string().min(5, "Areas to improve must be at least 5 characters"),
  studyHoursPerDay: z.coerce.number().min(0, "Cannot be negative").max(24, "Cannot exceed 24 hours"),
  stressLevel: z.coerce.number().min(1).max(5),
  academicConfidence: z.enum(["very_low", "low", "moderate", "high", "very_high"]),
  challenges: z.string().min(5, "Challenges must be at least 5 characters"),
  supportNeeded: z.string().min(5, "Support needed must be at least 5 characters"),
});

type SelfAssessmentFormValues = z.infer<typeof selfAssessmentSchema>;

type SelfAssessment = SelfAssessmentFormValues & {
  id: number;
  menteeId: number;
  createdAt: string;
};

export default function MenteeSelfAssessment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch previous self-assessments
  const { data: assessments, isLoading: isLoadingAssessments } = useQuery<SelfAssessment[]>({
    queryKey: ["/api/mentee/self-assessments"],
  });

  // Get the latest assessment if available
  const latestAssessment = assessments?.length ? assessments[0] : undefined;
  
  // Form setup
  const form = useForm<SelfAssessmentFormValues>({
    resolver: zodResolver(selfAssessmentSchema),
    defaultValues: {
      academicGoals: latestAssessment?.academicGoals || "",
      careerAspirations: latestAssessment?.careerAspirations || "",
      strengths: latestAssessment?.strengths || "",
      areasToImprove: latestAssessment?.areasToImprove || "",
      studyHoursPerDay: latestAssessment?.studyHoursPerDay || 2,
      stressLevel: latestAssessment?.stressLevel || 3,
      academicConfidence: latestAssessment?.academicConfidence || "moderate",
      challenges: latestAssessment?.challenges || "",
      supportNeeded: latestAssessment?.supportNeeded || "",
    },
  });

  // Create a new self-assessment
  const selfAssessmentMutation = useMutation({
    mutationFn: async (data: SelfAssessmentFormValues) => {
      const res = await apiRequest("POST", "/api/mentee/self-assessments", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Self-assessment saved",
        description: "Your self-assessment has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mentee/self-assessments"] });
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  function onSubmit(data: SelfAssessmentFormValues) {
    setIsSubmitting(true);
    selfAssessmentMutation.mutate(data);
  }

  return (
    <DashboardLayout 
      pageTitle="Self-Assessment" 
      pageDescription="Reflect on your academic progress and personal growth"
    >
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Personal Reflection</CardTitle>
                <CardDescription>
                  Take time to reflect on your academic journey and personal growth
                </CardDescription>
              </div>
              {latestAssessment && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Last submitted: {new Date(latestAssessment.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="academicGoals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Academic Goals</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What do you hope to achieve academically this semester?" 
                              className="min-h-[120px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="careerAspirations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Career Aspirations</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What are your career goals and aspirations?" 
                              className="min-h-[120px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="strengths"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Academic Strengths</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Your strongest academic areas" 
                                className="min-h-[100px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="areasToImprove"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Areas to Improve</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Areas where you need improvement" 
                                className="min-h-[100px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="studyHoursPerDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average Study Hours Per Day</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input 
                                type="number" 
                                min="0" 
                                max="24" 
                                step="0.5" 
                                className="w-20" 
                                {...field} 
                                onChange={(e) => {
                                  const value = e.target.value === "" ? "0" : e.target.value;
                                  field.onChange(value);
                                }}
                              />
                              <Slider
                                min={0}
                                max={12}
                                step={0.5}
                                value={[parseFloat(field.value.toString())]}
                                onValueChange={(values) => field.onChange(values[0])}
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0h</span>
                                <span>4h</span>
                                <span>8h</span>
                                <span>12h</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            How many hours do you spend studying outside of class per day?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="stressLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Stress Level</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input 
                                type="number" 
                                min="1" 
                                max="5" 
                                className="w-20" 
                                {...field} 
                                onChange={(e) => {
                                  const value = e.target.value === "" ? "1" : e.target.value;
                                  field.onChange(value);
                                }}
                              />
                              <div className="pt-2">
                                <RadioGroup 
                                  className="flex space-x-1" 
                                  value={field.value.toString()} 
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                >
                                  <FormItem className="flex flex-col items-center space-y-1 flex-1">
                                    <FormControl>
                                      <div className="flex flex-col items-center">
                                        <RadioGroupItem value="1" id="r1" className="sr-only" />
                                        <label htmlFor="r1" className={`w-full cursor-pointer rounded-md border p-2 text-center text-sm transition-colors ${field.value === 1 ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>Very Low</label>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                  <FormItem className="flex flex-col items-center space-y-1 flex-1">
                                    <FormControl>
                                      <div className="flex flex-col items-center">
                                        <RadioGroupItem value="2" id="r2" className="sr-only" />
                                        <label htmlFor="r2" className={`w-full cursor-pointer rounded-md border p-2 text-center text-sm transition-colors ${field.value === 2 ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>Low</label>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                  <FormItem className="flex flex-col items-center space-y-1 flex-1">
                                    <FormControl>
                                      <div className="flex flex-col items-center">
                                        <RadioGroupItem value="3" id="r3" className="sr-only" />
                                        <label htmlFor="r3" className={`w-full cursor-pointer rounded-md border p-2 text-center text-sm transition-colors ${field.value === 3 ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>Moderate</label>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                  <FormItem className="flex flex-col items-center space-y-1 flex-1">
                                    <FormControl>
                                      <div className="flex flex-col items-center">
                                        <RadioGroupItem value="4" id="r4" className="sr-only" />
                                        <label htmlFor="r4" className={`w-full cursor-pointer rounded-md border p-2 text-center text-sm transition-colors ${field.value === 4 ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>High</label>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                  <FormItem className="flex flex-col items-center space-y-1 flex-1">
                                    <FormControl>
                                      <div className="flex flex-col items-center">
                                        <RadioGroupItem value="5" id="r5" className="sr-only" />
                                        <label htmlFor="r5" className={`w-full cursor-pointer rounded-md border p-2 text-center text-sm transition-colors ${field.value === 5 ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>Very High</label>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                </RadioGroup>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            How would you rate your current stress level?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="academicConfidence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Academic Confidence</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your confidence level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="very_low">Very Low</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="moderate">Moderate</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="very_high">Very High</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            How confident do you feel about your academic performance?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="challenges"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Challenges</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What challenges are you currently facing?" 
                              className="min-h-[80px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="supportNeeded"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Needed</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What kind of support would help you succeed?" 
                              className="min-h-[80px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Self-Assessment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {assessments && assessments.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Previous Self-Assessments</CardTitle>
              <CardDescription>
                Review your past self-assessments to track your progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assessments.slice(1).map((assessment, index) => (
                  <div key={assessment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Assessment #{assessments.length - index - 1}</h3>
                      <Badge variant="outline" className="text-xs">
                        {new Date(assessment.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Academic Goals</h4>
                        <p className="text-sm">{assessment.academicGoals}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Career Aspirations</h4>
                        <p className="text-sm">{assessment.careerAspirations}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
