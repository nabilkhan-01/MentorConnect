import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Send, MessageCircle, Users, User } from "lucide-react";
import { format } from "date-fns";

type GroupMessage = {
  id: number;
  senderId: number;
  mentorId: number;
  content: string;
  isRead: boolean;
  isGroupMessage: boolean;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    role: string;
  };
};

type GroupMember = {
  id: number;
  name: string;
  role: string;
  usn?: string;
};

export default function GroupChat() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch group messages
  const { data: messages, isLoading, error: messagesError } = useQuery<GroupMessage[]>({
    queryKey: ["/api/group-messages"],
    enabled: !!user?.id,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Fetch group members (mentor and mentees)
  const { data: groupMembers, error: membersError } = useQuery<GroupMember[]>({
    queryKey: ["/api/group-members"],
    enabled: !!user?.id,
  });

  // Debug logging
  useEffect(() => {
    console.log("Group Chat Debug:", {
      user,
      messages,
      messagesError,
      groupMembers,
      membersError,
      isLoading
    });
  }, [user, messages, messagesError, groupMembers, membersError, isLoading]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/group-messages", {
        content: content.trim(),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/group-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      scrollToBottom();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync(newMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get group title based on user role
  const getGroupTitle = () => {
    if (user?.role === "mentor") {
      return "Group Chat with My Mentees";
    } else {
      return "Group Chat with Mentor & Peers";
    }
  };

  // Get group description
  const getGroupDescription = () => {
    if (user?.role === "mentor") {
      return "Communicate with all your mentees in one place";
    } else {
      return "Chat with your mentor and fellow mentees";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout pageTitle="Group Chat" pageDescription="Chat with your group">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error states
  if (messagesError || membersError) {
    return (
      <DashboardLayout pageTitle="Group Chat" pageDescription="Chat with your group">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <MessageCircle className="h-12 w-12 mx-auto mb-2" />
              <p className="font-semibold">Error Loading Group Chat</p>
            </div>
            <p className="text-muted-foreground mb-2">
              {messagesError?.message || membersError?.message}
            </p>
            <p className="text-sm text-muted-foreground">
              Please check your connection and try again.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Group Chat" pageDescription={getGroupDescription()}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Group Info & Members */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {getGroupTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Group Members</span>
                <Badge variant="secondary" className="ml-auto">
                  {groupMembers?.length || 0}
                </Badge>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {groupMembers?.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <Badge 
                        variant={member.role === "mentor" ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {member.role === "mentor" ? "Mentor" : "Mentee"}
                      </Badge>
                    </div>
                    {member.usn && (
                      <p className="text-xs text-muted-foreground">{member.usn}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col h-[600px]">
          <CardHeader className="border-b flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Group Chat
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[480px]">
              {messages && messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user?.id ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="max-w-xs lg:max-w-md">
                      {message.senderId !== user?.id && (
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>
                              <User className="h-3 w-3" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground">
                            {message.sender.name}
                            {message.sender.role === "mentor" && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                Mentor
                              </Badge>
                            )}
                          </span>
                        </div>
                      )}
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          message.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        {/* Timestamp removed as requested */}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  id="group-message-input"
                  name="group-message"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
