import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Settings, LogIn } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-5xl font-bold mb-6">Welcome to ChatApp</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Connect with friends and share moments through messages and images
          </p>
          
          {!user && (
            <Button 
              onClick={() => navigate('/auth')} 
              size="lg"
              className="mb-12"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Get Started
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                Real-time Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Send messages instantly with real-time updates. Stay connected with your friends and family.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Custom Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Customize your profile with avatars, display names, and personal bios to express yourself.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                Image Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Share images and moments with your contacts. Upload and send photos seamlessly.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {!user && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Ready to start chatting?
            </p>
            <Button 
              onClick={() => navigate('/auth')}
              variant="outline"
            >
              Sign In or Create Account
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;