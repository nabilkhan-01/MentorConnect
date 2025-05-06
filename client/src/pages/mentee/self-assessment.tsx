import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const selfAssessmentSchema = z.object({
  academicGoals: z.string().min(10, "Academic goals should be at least 10 characters"),
  careerAspirations: z.string().min(10, "Career aspirations should be at least 10 characters"),
  strengths: z.string().min(10, "Strengths should be at least 10 characters"),
  areasToImprove: z.string().min(10, "Areas to improve should be at least 10 characters"),
  studyHoursPerDay: z.number().min(0).max(24),
  stressLevel: z.number().min(1).max(10),
  academicConfidence: z.string().min(10, "Academic confidence should be at least 10 characters"),
  challenges: z.string().min(10, "Challenges should be at least 10 characters"),
  supportNeeded: z.string().min(10, "Support needed should be at least 10 characters")
});

type SelfAssessmentFormValues = z.infer<typeof selfAssessmentSchema>;

export default function MenteeSelfAssessment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submittedAssessment, setSubmittedAssessment] = useState(false);

  // Fetch previous self-assessments
  const { data: assessments, isLoading } = useQuery<Array<any>>({ // Using Array<any> type to fix type issues
    queryKey: ["/api/mentee/self-assessments"],
    enabled: !!user
  });

  // Submit new self-assessment
  const createMutation = useMutation({
    mutationFn: async (data: SelfAssessmentFormValues) => {
      const response = await apiRequest("POST", "/api/mentee/self-assessments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentee/self-assessments"] });
      toast({
        title: "Self-assessment submitted",
        description: "Your self-assessment has been successfully submitted to your mentor.",
      });
      setSubmittedAssessment(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting self-assessment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<SelfAssessmentFormValues>({
    resolver: zodResolver(selfAssessmentSchema),
    defaultValues: {
      academicGoals: "",
      careerAspirations: "",
      strengths: "",
      areasToImprove: "",
      studyHoursPerDay: 3,
      stressLevel: 5,
      academicConfidence: "",
      challenges: "",
      supportNeeded: "",
    },
  });

  function onSubmit(data: SelfAssessmentFormValues) {
    createMutation.mutate(data);
  }

  const hasPreviousAssessments = assessments && assessments.length > 0;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Self Assessment</h1>
      <p className="text-muted-foreground mb-8">
        Complete this form to help your mentor understand your academic journey, challenges, and goals.
        This information will be used to provide tailored support for your success.
      </p>

      {submittedAssessment ? (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Thank You!</CardTitle>
            <CardDescription>
              Your self-assessment has been submitted successfully. Your mentor will review your responses and provide guidance accordingly.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setSubmittedAssessment(false)} variant="outline">Submit Another Assessment</Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Academic Self-Assessment Form</CardTitle>
            <CardDescription>
              Provide honest responses to help us understand how we can better support your academic journey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Academic Goals & Aspirations</h3>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="academicGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are your academic goals for this semester?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Improve my GPA, master programming concepts, complete all assignments on time..."
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
                        <FormLabel>What are your long-term career aspirations?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Software engineer at a tech company, pursue higher education in AI..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Self-Reflection</h3>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="strengths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What do you consider to be your academic strengths?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Problem-solving skills, time management, creativity..."
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
                        <FormLabel>What areas would you like to improve?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Technical writing skills, public speaking, understanding complex algorithms..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Study Habits & Well-being</h3>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="studyHoursPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How many hours do you typically study per day?</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Slider
                              value={[field.value]}
                              min={0}
                              max={24}
                              step={0.5}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                            <div className="flex justify-between">
                              <span className="text-sm">{field.value} hours</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stressLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How would you rate your current academic stress level?</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Slider
                              value={[field.value]}
                              min={1}
                              max={10}
                              step={1}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                            <div className="flex justify-between">
                              <span className="text-sm">Low (1)</span>
                              <span className="text-sm">Current: {field.value}</span>
                              <span className="text-sm">High (10)</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Support & Challenges</h3>
                  <Separator />
                  <FormField
                    control={form.control}
                    name="academicConfidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How confident do you feel about your academic performance this semester?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., I feel confident about most subjects but worried about the final project..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="challenges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What specific challenges are you facing in your studies?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Difficulty understanding specific topics, balancing coursework with other responsibilities..."
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
                        <FormLabel>What kind of support do you need from your mentor?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Help with career guidance, academic resources, study strategies..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Self-Assessment"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {hasPreviousAssessments && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Previous Assessments</h2>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              assessments.map((assessment: any) => (
                <Card key={assessment.id}>
                  <CardHeader>
                    <CardTitle>Assessment {new Date(assessment.createdAt).toLocaleDateString()}</CardTitle>
                    <CardDescription>
                      Submitted on {new Date(assessment.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Academic Goals</h4>
                        <p className="text-muted-foreground">{assessment.academicGoals}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Study Hours</h4>
                        <p className="text-muted-foreground">{assessment.studyHoursPerDay} hours per day</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Stress Level</h4>
                        <p className="text-muted-foreground">{assessment.stressLevel}/10</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
