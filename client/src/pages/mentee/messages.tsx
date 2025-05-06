import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const messageSchema = z.object({
  receiverId: z.number(),
  content: z.string().min(1, "Message cannot be empty").max(1000, "Message is too long"),
});

type MessageFormValues = z.infer<typeof messageSchema>;
type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: number;
    name: string;
    username: string;
  };
};

export default function MenteeMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Fetch mentor info to know who to send messages to
  const { data: menteeData } = useQuery<any>({
    queryKey: ["/api/mentee/profile"],
    enabled: !!user
  });

  // Fetch messages
  const { data: messages, isLoading } = useQuery<Array<Message>>({
    queryKey: ["/api/messages"],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Send a new message
  const sendMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      form.reset({ receiverId: menteeData?.mentor?.userId, content: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark message as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("PATCH", `/api/messages/${messageId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: Error) => {
      console.error("Error marking message as read:", error);
    },
  });

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      receiverId: menteeData?.mentor?.userId || 0,
      content: "",
    },
  });

  function onSubmit(data: MessageFormValues) {
    sendMutation.mutate(data);
  }

  // Extract unique conversation partners
  const conversationPartners = messages ? [...new Set(messages.map((m: Message) => 
    m.senderId === user?.id ? m.receiverId : m.senderId
  ))].map(partnerId => {
    const message = messages.find((m: Message) => 
      m.senderId === partnerId || m.receiverId === partnerId
    );
    return {
      id: partnerId,
      name: message?.sender?.name || "Unknown",
      username: message?.sender?.username || "unknown",
      lastMessage: messages
        .filter((m: Message) => m.senderId === partnerId || m.receiverId === partnerId)
        .sort((a: Message, b: Message) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0],
      unreadCount: messages.filter((m: Message) => 
        m.senderId === partnerId && !m.isRead
      ).length,
    };
  }) : [];

  const getMessagesWithPartner = (partnerId: number) => {
    if (!messages) return [];
    return messages
      .filter((m: Message) => 
        (m.senderId === user?.id && m.receiverId === partnerId) || 
        (m.senderId === partnerId && m.receiverId === user?.id)
      )
      .sort((a: Message, b: Message) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead && message.senderId !== user?.id) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const hasMentor = menteeData?.mentor?.userId;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      {!hasMentor ? (
        <Card>
          <CardHeader>
            <CardTitle>No Mentor Assigned</CardTitle>
            <CardDescription>
              You don't have a mentor assigned yet. Once you are assigned a mentor, you will be able to send and receive messages here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar - conversation list */}
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : conversationPartners.length === 0 ? (
                  <p className="text-muted-foreground">No conversations yet</p>
                ) : (
                  <div className="space-y-2">
                    {conversationPartners.map(partner => (
                      <div 
                        key={partner.id}
                        className={`p-3 rounded-md hover:bg-muted cursor-pointer transition-colors ${
                          selectedMessage && (selectedMessage.senderId === partner.id || selectedMessage.receiverId === partner.id) 
                            ? 'bg-muted' 
                            : ''
                        }`}
                        onClick={() => {
                          const partnerMessages = getMessagesWithPartner(partner.id);
                          if (partnerMessages.length > 0) {
                            handleMessageClick(partnerMessages[partnerMessages.length - 1]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className="font-medium truncate">{partner.name}</p>
                              {partner.unreadCount > 0 && (
                                <span className="inline-flex items-center rounded-full bg-primary px-2 py-1 text-xs font-medium text-white">
                                  {partner.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {partner.lastMessage ? 
                                (partner.lastMessage.senderId === user?.id ? 'You: ' : '') + partner.lastMessage.content : 
                                'No messages yet'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right side - message content */}
          <div className="md:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>
                  {selectedMessage ? 
                    (selectedMessage.senderId === user?.id ? 
                      `To: ${menteeData?.mentor?.name || 'Your Mentor'}` : 
                      `From: ${selectedMessage.sender?.name || 'Your Mentor'}`) : 
                    "Select a conversation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !selectedMessage ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Select a conversation to view messages</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getMessagesWithPartner(selectedMessage.senderId === user?.id ? 
                      selectedMessage.receiverId : selectedMessage.senderId)
                      .map((message: Message) => (
                        <div 
                          key={message.id} 
                          className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.senderId === user?.id ? 
                                'bg-primary text-primary-foreground' : 
                                'bg-muted'
                            }`}
                          >
                            <p>{message.content}</p>
                            <div className="flex items-center justify-end mt-1 text-xs opacity-70">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>

              <div className="p-4 border-t">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name="receiverId"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input 
                              type="hidden" 
                              {...field}
                              value={menteeData?.mentor?.userId || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              placeholder="Type your message here..."
                              {...field}
                              disabled={!hasMentor || sendMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={!hasMentor || sendMutation.isPending}
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span className="sr-only">Send</span>
                    </Button>
                  </form>
                </Form>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
