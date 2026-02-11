import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Users, 
  User, 
  Calendar,
  Mail,
  Hash,
  ArrowLeft
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";

type GroupChat = {
  mentorId: number;
  mentor: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  mentees: Array<{
    id: number;
    name: string;
    username: string;
    email: string;
    usn: string;
  }>;
  recentMessages: Array<{
    id: number;
    content: string;
    createdAt: string;
    senderId: number;
    senderName: string;
    senderUsername: string;
  }>;
  totalMembers: number;
};

export default function AdminGroupChats() {
  const [selectedMentor, setSelectedMentor] = useState<GroupChat | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: groupChats, isLoading, error } = useQuery<GroupChat[]>({
    queryKey: ["/api/admin/group-chats"],
  });


  // Filter mentors based on search term
  const filteredGroupChats = useMemo(() => {
    if (!groupChats) return [];
    if (!searchTerm.trim()) return groupChats;
    
    const searchLower = searchTerm.toLowerCase();
    return groupChats.filter(chat => 
      (chat.mentor.name?.toLowerCase() || '').includes(searchLower) ||
      (chat.mentor.email?.toLowerCase() || '').includes(searchLower) ||
      (chat.mentor.username?.toLowerCase() || '').includes(searchLower)
    );
  }, [groupChats, searchTerm]);


  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Group Chats</h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                    <div className="h-3 bg-muted rounded w-4/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If a mentor is selected, show their chat messages
  if (selectedMentor) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMentor(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mentors
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedMentor.mentor.name || 'Unknown Mentor'}'s Group Chat
              </h1>
              <p className="text-muted-foreground">
                {selectedMentor.totalMembers} members • {selectedMentor.recentMessages.length} messages
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Mentor Info */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Mentor Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(selectedMentor.mentor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedMentor.mentor.name || 'Unknown Mentor'}</h3>
                    <p className="text-sm text-muted-foreground">{selectedMentor.mentor.email || 'No email provided'}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Mentees ({selectedMentor.mentees.length})</h4>
                  {selectedMentor.mentees.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No mentees assigned to this mentor
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedMentor.mentees.map((mentee) => (
                        <div key={mentee.id} className="flex items-center gap-2 text-sm">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{mentee.usn}</span>
                          <span className="text-muted-foreground">{mentee.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat Messages */}
            <Card className="lg:col-span-3 flex flex-col h-[600px]">
              <CardHeader className="border-b flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Group Messages
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <ScrollArea className="flex-1 p-4">
                  {selectedMentor.recentMessages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedMentor.recentMessages.map((message) => (
                        <div key={message.id} className="flex flex-col space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {message.senderName}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {message.senderUsername}
                              </Badge>
                            </div>
                            {/* Timestamp removed as requested */}
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 max-w-[80%]">
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Group Chats</h1>
            <p className="text-muted-foreground">
              Monitor all mentor-mentee group conversations
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <MessageCircle className="h-4 w-4 mr-1" />
            {filteredGroupChats.length} Groups
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Input
              id="search-mentors"
              name="search-mentors"
              placeholder="Search mentors by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          {searchTerm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchTerm("")}
            >
              Clear
            </Button>
          )}
        </div>

        {!groupChats || groupChats.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Group Chats</h3>
              <p className="text-muted-foreground text-center">
                No mentor-mentee group chats have been created yet.
              </p>
            </CardContent>
          </Card>
        ) : filteredGroupChats.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Mentors Found</h3>
              <p className="text-muted-foreground text-center">
                No mentors match your search criteria.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="mt-4"
              >
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGroupChats.map((chat) => (
              <Card 
                key={chat.mentorId} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedMentor(chat)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(chat.mentor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {chat.mentor.name || 'Unknown Mentor'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.mentor.email || 'No email provided'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {chat.totalMembers}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Group Info */}
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-lg font-semibold">{chat.totalMembers}</span>
                      <span className="text-sm text-muted-foreground">members</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {chat.mentees.length === 0 ? (
                        "No mentees assigned"
                      ) : (
                        `${chat.mentees.length} mentees + 1 mentor`
                      )}
                    </p>
                  </div>

                  <Separator />

                  {/* Recent Messages Preview */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      Recent Messages ({chat.recentMessages.length})
                    </h4>
                    {chat.recentMessages.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No messages yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {chat.recentMessages.slice(0, 2).map((message) => (
                          <div key={message.id} className="text-xs">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="font-medium text-foreground">
                                {message.senderName}
                              </span>
                              {/* Timestamp removed as requested */}
                            </div>
                            <p className="text-muted-foreground line-clamp-2">
                              {message.content}
                            </p>
                          </div>
                        ))}
                        {chat.recentMessages.length > 2 && (
                          <p className="text-xs text-muted-foreground italic">
                            +{chat.recentMessages.length - 2} more messages
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Click to view button */}
                  <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMentor(chat);
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        View Chat
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
