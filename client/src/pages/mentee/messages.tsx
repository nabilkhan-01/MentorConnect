import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getInitials } from "@/lib/utils";
import { Send, Loader2, AlertCircle } from "lucide-react";

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  sender: {
    id: number;
    username: string;
    name?: string;
    role: string;
  };
};

type MenteeProfile = {
  mentee: {
    id: number;
    usn: string;
    semester: number;
    section: string;
    mobileNumber?: string;
    parentMobileNumber?: string;
    name?: string;
    email?: string;
  };
  mentor: {
    id: number;
    userId: number;
    department?: string;
    specialization?: string;
    mobileNumber?: string;
    name?: string;
    email?: string;
  } | null;
};

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(1000, "Message is too long"),
});

type MessageFormValues = z.infer<typeof messageSchema>;

export default function MenteeMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: profileData, isLoading: isProfileLoading } = useQuery<MenteeProfile>({
    queryKey: ["/api/mentee/profile"],
  });
  
  const { data: messages, isLoading: isMessagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      if (!profileData?.mentor?.userId) {
        throw new Error("No mentor assigned");
      }
      
      const res = await apiRequest("POST", "/api/messages", {
        receiverId: profileData.mentor.userId,
        content: data.content,
      });
      return await res.json();
    },
    onSuccess: () => {
      form.reset({ content: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  function onSubmit(data: MessageFormValues) {
    setIsSubmitting(true);
    sendMessageMutation.mutate(data);
  }

  // Format the timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + 
      date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: Record<string, Message[]> = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages,
    }));
  };

  const messageGroups = messages ? groupMessagesByDate(messages) : [];

  return (
    <DashboardLayout 
      pageTitle="Messages" 
      pageDescription="Communicate with your mentor"
    >
      <div className="grid grid-cols-1 gap-6">
        <Card className="min-h-[calc(100vh-12rem)]">
          <CardHeader className="pb-3">
            <CardTitle>Conversation with Your Mentor</CardTitle>
            <CardDescription>
              Use this space to ask questions and receive guidance from your mentor
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isProfileLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !profileData?.mentor ? (
              <div className="p-6">
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No mentor assigned</AlertTitle>
                  <AlertDescription>
                    You don't have a mentor assigned yet. Please contact your administrator.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex flex-col h-[calc(100vh-18rem)]">
                <div className="px-4 py-2 border-b bg-muted/50">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(profileData.mentor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{profileData.mentor.name}</p>
                      <p className="text-xs text-muted-foreground">{profileData.mentor.department}</p>
                    </div>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {isMessagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="rounded-full bg-primary/10 p-3 mb-2">
                        <Send className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium">No messages yet</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Send a message to your mentor to start a conversation
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messageGroups.map((group, groupIndex) => (
                        <div key={groupIndex} className="space-y-4">
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center">
                              <span className="bg-background px-2 text-xs text-muted-foreground">
                                {new Date(group.date).toLocaleDateString([], { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                          </div>
                          
                          {group.messages.map((message) => {
                            const isSentByMe = message.sender.id === user?.id;
                            
                            return (
                              <div 
                                key={message.id} 
                                className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`flex max-w-[80%] ${isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                  {!isSentByMe && (
                                    <Avatar className="h-8 w-8 mr-2">
                                      <AvatarFallback className="bg-primary text-primary-foreground">
                                        {getInitials(message.sender.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div 
                                    className={`px-4 py-2 rounded-lg ${isSentByMe 
                                      ? 'bg-primary text-primary-foreground ml-2' 
                                      : 'bg-muted'}`}
                                  >
                                    <div className="flex flex-col">
                                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                                      <span className={`text-xs mt-1 ${isSentByMe 
                                        ? 'text-primary-foreground/70' 
                                        : 'text-muted-foreground'}`}>
                                        {formatMessageTime(message.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                <div className="p-4 border-t">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex space-x-2">
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Textarea 
                                placeholder="Type a message..." 
                                className="min-h-[60px] resize-none" 
                                {...field} 
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (field.value.trim() !== '') {
                                      form.handleSubmit(onSubmit)();
                                    }
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="self-end"
                        disabled={isSubmitting || !profileData?.mentor}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span className="sr-only">Send message</span>
                      </Button>
                    </form>
                  </Form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
