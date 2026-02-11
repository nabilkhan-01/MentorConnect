import { useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "Current password must be at least 6 characters"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const notificationsFormSchema = z.object({
  emailAlerts: z.boolean().default(true),
  loginAlerts: z.boolean().default(true),
  appUpdates: z.boolean().default(true),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  if (!user) return <></>; // Return empty fragment instead of null

  const isReadOnly = [UserRole.ADMIN, UserRole.MENTOR, UserRole.MENTEE].includes(
    user.role as (typeof UserRole)[keyof typeof UserRole],
  );

  const lastReadOnlyToastAt = useRef(0);
  const notifyReadOnly = useCallback(() => {
    const now = Date.now();
    if (now - lastReadOnlyToastAt.current < 1500) return;
    lastReadOnlyToastAt.current = now;
    toast({
      title: "Read-only",
      description: "Settings are view-only.",
      variant: "destructive",
    });
  }, [toast]);
  
  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const res = await apiRequest("POST", `/api/user/${user.id}/change-password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully."
      });
      passwordForm.reset({
        currentPassword: "",
        newPassword: "", 
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const notificationsMutation = useMutation({
    mutationFn: async (data: NotificationsFormValues) => {
      const res = await apiRequest("POST", `/api/user/${user.id}/notification-settings`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been updated successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      emailAlerts: true,
      loginAlerts: true,
      appUpdates: true,
    },
  });
  
  function onPasswordSubmit(data: PasswordFormValues) {
    if (isReadOnly) {
      notifyReadOnly();
      return;
    }
    passwordMutation.mutate(data);
  }
  
  function onNotificationsSubmit(data: NotificationsFormValues) {
    if (isReadOnly) {
      notifyReadOnly();
      return;
    }
    notificationsMutation.mutate(data);
  }
  
  return (
    <DashboardLayout pageTitle="Settings" pageDescription="View your account settings and preferences">
      <Tabs defaultValue="password" className="space-y-6">
        <TabsList>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>View-only</CardDescription>
            </CardHeader>
            <CardContent className="max-w-md">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your current password" 
                            readOnly={isReadOnly}
                            onFocusCapture={() => {
                              if (isReadOnly) notifyReadOnly();
                            }}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your new password" 
                            readOnly={isReadOnly}
                            onFocusCapture={() => {
                              if (isReadOnly) notifyReadOnly();
                            }}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirm your new password" 
                            readOnly={isReadOnly}
                            onFocusCapture={() => {
                              if (isReadOnly) notifyReadOnly();
                            }}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isReadOnly ? (
                    <Button type="button" className="mt-2" onClick={notifyReadOnly}>
                      Read-only
                    </Button>
                  ) : (
                    <Button type="submit" className="mt-2" disabled={passwordMutation.isPending}>
                      {passwordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>View-only</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationsForm}>
                <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)} className="space-y-6">
                  <FormField
                    control={notificationsForm.control}
                    name="emailAlerts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Email Alerts</FormLabel>
                          <FormDescription>
                            Receive email notifications for important updates
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(next) => {
                              if (isReadOnly) return notifyReadOnly();
                              field.onChange(next);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationsForm.control}
                    name="loginAlerts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Login Alerts</FormLabel>
                          <FormDescription>
                            Receive notifications when your account is accessed
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(next) => {
                              if (isReadOnly) return notifyReadOnly();
                              field.onChange(next);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationsForm.control}
                    name="appUpdates"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">System Updates</FormLabel>
                          <FormDescription>
                            Receive notifications about system updates and new features
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(next) => {
                              if (isReadOnly) return notifyReadOnly();
                              field.onChange(next);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {isReadOnly ? (
                    <Button type="button" onClick={notifyReadOnly}>
                      Read-only
                    </Button>
                  ) : (
                    <Button type="submit" disabled={notificationsMutation.isPending}>
                      {notificationsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Preferences
                    </Button>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
