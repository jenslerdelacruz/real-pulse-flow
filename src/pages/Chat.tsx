import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Send, Image, User, Plus, Settings, LogOut, UserPlus, Menu, ArrowLeft, Video } from 'lucide-react';
import { VideoCall } from '@/components/VideoCall';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  content: string | null;
  image_url?: string | null;
  message_type: 'text' | 'image';
  created_at: string;
  sender_id: string;
  conversation_id: string;
  sender_profile?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  name?: string;
  is_group: boolean;
  created_at: string;
  participants?: Profile[];
}

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  last_seen?: string;
}

const Chat = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [foundUsers, setFoundUsers] = useState<Profile[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallUrl, setVideoCallUrl] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      updateUserPresence();
      subscribeToPresence();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      subscribeToMessages();
      setShowSidebar(false); // Hide sidebar on mobile when conversation is selected
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateUserPresence = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  const subscribeToPresence = () => {
    const channel = supabase
      .channel('presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    fetchOnlineUsers();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchOnlineUsers = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .gte('last_seen', fiveMinutesAgo);

      setOnlineUsers(new Set(data?.map(p => p.user_id) || []));
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId);
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            name,
            is_group,
            created_at
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const convos = data?.map(item => item.conversations).filter(Boolean) || [];
      
      // Fetch participants for each conversation
      const conversationsWithParticipants: Conversation[] = await Promise.all(
        convos.map(async (conv: any) => {
          const { data: participantData } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id);

          const userIds = participantData?.map(p => p.user_id) || [];
          
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, user_id, username, display_name, avatar_url, last_seen')
            .in('user_id', userIds);

          return {
            ...conv,
            participants: profilesData || []
          } as Conversation;
        })
      );

      setConversations(conversationsWithParticipants);
      
      if (conversationsWithParticipants.length > 0 && !selectedConversation) {
        setSelectedConversation(conversationsWithParticipants[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading conversations",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profile data separately
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', senderIds);

      // Combine messages with profile data
      const messagesWithProfiles = messagesData?.map(message => ({
        ...message,
        message_type: message.message_type as 'text' | 'image',
        sender_profile: profilesData?.find(p => p.user_id === message.sender_id)
      })) || [];

      setMessages(messagesWithProfiles as Message[]);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`
        },
        (payload) => {
          fetchMessages(); // Refetch to get profile data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setIsLoading(true);
    try {
      await updateUserPresence(); // Update presence when sending message

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user?.id,
          content: newMessage,
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateUserPresence(); // Update presence when uploading

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user?.id,
          image_url: data.publicUrl,
          message_type: 'image'
        });

      if (messageError) throw messageError;

      toast({
        title: "Image sent",
        description: "Your image has been sent successfully."
      });
    } catch (error: any) {
      toast({
        title: "Failed to send image",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const searchForUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFoundUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .neq('user_id', user?.id)
        .limit(10);

      if (error) throw error;
      setFoundUsers(data || []);
    } catch (error: any) {
      console.error('User search error:', error);
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const createConversationWithUser = async (otherUser: Profile) => {
    try {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: `Chat with ${otherUser.display_name}`,
          is_group: false,
          created_by: user?.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add both users as participants
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: conversation.id,
            user_id: user?.id
          },
          {
            conversation_id: conversation.id,
            user_id: otherUser.user_id
          }
        ]);

      if (participantError) throw participantError;

      toast({
        title: "Chat created",
        description: `Started a chat with ${otherUser.display_name}`
      });

      setShowAddUser(false);
      setSearchUsers('');
      setFoundUsers([]);
      fetchConversations();
      setSelectedConversation(conversation.id);
    } catch (error: any) {
      toast({
        title: "Failed to create chat",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      navigate('/');
    }
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.name && conversation.is_group) {
      return conversation.name;
    }
    
    const otherParticipant = conversation.participants?.find(
      p => p.user_id !== user?.id
    );
    
    return otherParticipant?.display_name || 'Unknown User';
  };

  const getCurrentConversation = () => {
    return conversations.find(c => c.id === selectedConversation);
  };

  const startVideoCall = () => {
    setShowVideoCall(true);
  };

  const handleVideoCallRoomCreated = (roomUrl: string) => {
    setVideoCallUrl(roomUrl);
    // You could send the room URL to the other participant via a message
    if (selectedConversation) {
      supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user?.id,
          content: `📹 Video call started: ${roomUrl}`,
          message_type: 'text'
        });
    }
  };

  const selectedConv = getCurrentConversation();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden border-b border-border bg-background p-3 flex items-center justify-between">
        {selectedConversation ? (
          <>
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedConversation(null)}
                className="p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedConv?.participants?.find(p => p.user_id !== user?.id)?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  {!selectedConv?.is_group && selectedConv?.participants?.some(p => 
                    p.user_id !== user?.id && isUserOnline(p.user_id)
                  ) && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <h2 className="font-medium text-sm">{getConversationName(selectedConv!)}</h2>
                  {!selectedConv?.is_group && selectedConv?.participants?.some(p => 
                    p.user_id !== user?.id && isUserOnline(p.user_id)
                  ) && (
                    <p className="text-xs text-green-600">Online</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={startVideoCall}
                disabled={!selectedConv?.participants?.some(p => p.user_id !== user?.id)}
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">ChatApp</h1>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block border-b border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">ChatApp</h1>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex bg-background overflow-hidden">
        {/* Sidebar - Desktop Always Visible, Mobile Conditional */}
        <div className={`
          lg:w-80 lg:block border-r border-border bg-muted/30
          ${selectedConversation ? 'hidden lg:block' : 'w-full block'}
        `}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <div className="flex space-x-2">
                <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="mx-4">
                    <DialogHeader>
                      <DialogTitle>Start a chat with someone</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Search users by username or name..."
                        value={searchUsers}
                        onChange={(e) => {
                          setSearchUsers(e.target.value);
                          searchForUsers(e.target.value);
                        }}
                      />
                      <ScrollArea className="h-60">
                        <div className="space-y-2">
                          {foundUsers.map((profile) => (
                            <Card 
                              key={profile.id} 
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => createConversationWithUser(profile)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center space-x-3">
                                  <div className="relative">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={profile.avatar_url} />
                                      <AvatarFallback>
                                        <User className="h-4 w-4" />
                                      </AvatarFallback>
                                    </Avatar>
                                    {isUserOnline(profile.user_id) && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <p className="font-medium">{profile.display_name}</p>
                                      {isUserOnline(profile.user_id) && (
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Online</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {searchUsers && foundUsers.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                              No users found
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-141px)] lg:h-[calc(100vh-141px)]">
            <div className="p-2 space-y-2">
              {conversations.map((conversation) => {
                const otherParticipant = conversation.participants?.find(
                  p => p.user_id !== user?.id
                );
                const isOnline = otherParticipant && isUserOnline(otherParticipant.user_id);
                
                return (
                  <Card
                    key={conversation.id}
                    className={`cursor-pointer transition-colors ${
                      selectedConversation === conversation.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={otherParticipant?.avatar_url} />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          {!conversation.is_group && isOnline && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">
                              {getConversationName(conversation)}
                            </h3>
                            {!conversation.is_group && isOnline && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 ml-2">
                                Online
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {conversation.is_group ? 'Group Chat' : 'Direct Message'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={`
          flex-1 flex flex-col
          ${!selectedConversation ? 'hidden lg:flex' : 'flex'}
        `}>
          {selectedConversation ? (
            <>
              {/* Desktop Chat Header */}
              <div className="hidden lg:block border-b border-border p-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConv?.participants?.find(p => p.user_id !== user?.id)?.avatar_url} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    {!selectedConv?.is_group && selectedConv?.participants?.some(p => 
                      p.user_id !== user?.id && isUserOnline(p.user_id)
                    ) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold">{getConversationName(selectedConv!)}</h2>
                    {!selectedConv?.is_group && selectedConv?.participants?.some(p => 
                      p.user_id !== user?.id && isUserOnline(p.user_id)
                    ) && (
                      <p className="text-sm text-green-600">Online</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={startVideoCall}
                    disabled={!selectedConv?.participants?.some(p => p.user_id !== user?.id)}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video Call
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex max-w-[85%] sm:max-w-[70%] ${
                          message.sender_id === user?.id
                            ? 'flex-row-reverse'
                            : 'flex-row'
                        }`}
                      >
                        <Avatar className="h-8 w-8 mx-2 flex-shrink-0">
                          <AvatarImage src={message.sender_profile?.avatar_url} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`rounded-lg p-3 ${
                            message.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-xs opacity-70 mb-1">
                            {message.sender_profile?.display_name}
                          </p>
                          {message.message_type === 'text' ? (
                            <p className="break-words">{message.content}</p>
                          ) : (
                            <img
                              src={message.image_url}
                              alt="Shared image"
                              className="max-w-full max-h-64 h-auto rounded cursor-pointer"
                              onClick={() => window.open(message.image_url, '_blank')}
                            />
                          )}
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <form onSubmit={sendMessage} className="flex items-center space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={uploadImage}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button type="submit" disabled={isLoading || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <VideoCall
        isOpen={showVideoCall}
        onClose={() => setShowVideoCall(false)}
        roomUrl={videoCallUrl}
        onRoomCreated={handleVideoCallRoomCreated}
      />
    </div>
  );
};

export default Chat;