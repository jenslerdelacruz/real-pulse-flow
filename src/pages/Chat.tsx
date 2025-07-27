import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, Image, User, Plus, Settings, LogOut } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations (
            id,
            name,
            is_group,
            created_at
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const convos = data?.map(item => item.conversations).filter(Boolean) || [];
      setConversations(convos);
      
      if (convos.length > 0 && !selectedConversation) {
        setSelectedConversation(convos[0].id);
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

    try {
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
    }
  };

  const createConversation = async () => {
    try {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: 'New Chat',
          is_group: false,
          created_by: user?.id
        })
        .select()
        .single();

      if (convError) throw convError;

      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user?.id
        });

      if (participantError) throw participantError;

      fetchConversations();
      setSelectedConversation(conversation.id);
    } catch (error: any) {
      toast({
        title: "Failed to create conversation",
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
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

      <div className="flex-1 flex bg-background">
        {/* Sidebar */}
        <div className="w-80 border-r border-border bg-muted/50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <Button size="sm" onClick={createConversation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-141px)]">
            <div className="p-2 space-y-2">
              {conversations.map((conversation) => (
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
                    <h3 className="font-medium">
                      {conversation.name || 'Unnamed Chat'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {conversation.is_group ? 'Group Chat' : 'Direct Message'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
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
                      className={`flex max-w-[70%] ${
                        message.sender_id === user?.id
                          ? 'flex-row-reverse'
                          : 'flex-row'
                      }`}
                    >
                      <Avatar className="h-8 w-8 mx-2">
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
                          <p>{message.content}</p>
                        ) : (
                          <img
                            src={message.image_url}
                            alt="Shared image"
                            className="max-w-full h-auto rounded"
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
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={uploadImage}
                    className="hidden"
                  />
                  <Button type="button" size="icon" variant="outline">
                    <Image className="h-4 w-4" />
                  </Button>
                </label>
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
    </div>
  );
};

export default Chat;