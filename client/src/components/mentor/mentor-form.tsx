import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const mentorFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email").optional(),
  department: z.string().min(2, "Department must be at least 2 characters"),
  specialization: z.string().optional(),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits").optional(),
  isActive: z.boolean().default(true),
});

type MentorFormValues = z.infer<typeof mentorFormSchema>;

type MentorFormProps = {
  onSubmit: (data: MentorFormValues) => void;
  initialValues?: Partial<MentorFormValues>;
  isSubmitting?: boolean;
  mode?: "add" | "edit";
};

export function MentorForm({
  onSubmit,
  initialValues = {},
  isSubmitting = false,
  mode = "add",
}: MentorFormProps) {
  // Normalize incoming initial values: convert null to undefined for optional fields
  const normalizedInitials: Partial<MentorFormValues> = {
    ...initialValues,
    email: initialValues?.email ?? undefined,
    specialization: initialValues?.specialization ?? undefined,
    mobileNumber: initialValues?.mobileNumber ?? undefined,
  };

  const form = useForm<MentorFormValues>({
    resolver: zodResolver(mentorFormSchema),
    defaultValues: {
      name: "",
      email: undefined,
      department: "",
      specialization: undefined,
      mobileNumber: undefined,
      isActive: true,
      ...normalizedInitials
    }
  });

  // Before submit, coerce empty strings to undefined for optional fields
  const handleSubmit = (values: MentorFormValues) => {
    const payload: MentorFormValues = {
      ...values,
      email: values.email === "" ? undefined : values.email,
      specialization: values.specialization === "" ? undefined : values.specialization,
      mobileNumber: values.mobileNumber === "" ? undefined : values.mobileNumber,
    };
    onSubmit(payload);
  };

  return (
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter email (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Enter department" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="specialization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialization</FormLabel>
                <FormControl>
                  <Input placeholder="Enter specialization (optional)" {...field} />
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
                  <Input placeholder="Enter mobile number (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {mode === "edit" && (
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value 
                        ? "Mentor is active and can be assigned mentees" 
                        : "Mentor is inactive and cannot be assigned mentees"}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
             Reset
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "add" ? "Add Mentor" : "Update Mentor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default MentorForm;
