import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Settings, LogIn, Image, Sparkles, Users, Video } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-lg font-medium bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Loading ChatApp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 animate-pulse" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Welcome to the future of messaging</span>
            </div>
            
            <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent animate-scale-in">
              ChatApp
            </h1>
            
            <p className="text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Connect with friends, share moments, and experience seamless communication with real-time messaging, video calls, and beautiful interface
            </p>
            
            {!user && (
              <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="lg"
                  className="relative overflow-hidden group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-white border-0 px-8 py-6 text-lg font-semibold shadow-2xl hover:shadow-primary/25 transition-all duration-300 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <LogIn className="mr-3 h-6 w-6" />
                  Start Chatting Now
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  Join thousands of users already connected
                </p>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-20 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <Card className="relative overflow-hidden group hover:scale-105 transition-all duration-300 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-xl hover:shadow-2xl hover:shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold">Real-time Chat</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <CardDescription className="text-base leading-relaxed">
                  Lightning-fast messaging with instant delivery, read receipts, and seamless synchronization across all your devices.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:scale-105 transition-all duration-300 border-primary/20 bg-gradient-to-br from-background via-background to-secondary/5 shadow-xl hover:shadow-2xl hover:shadow-secondary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Video className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="text-xl font-bold">Video Calls</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <CardDescription className="text-base leading-relaxed">
                  Crystal-clear video calls with screen sharing, group calls, and advanced features for seamless communication.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:scale-105 transition-all duration-300 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-xl hover:shadow-2xl hover:shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-400/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Image className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-xl font-bold">Media Sharing</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <CardDescription className="text-base leading-relaxed">
                  Share photos, videos, documents, and more with automatic compression and beautiful previews.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-8 mb-20 animate-fade-in" style={{ animationDelay: '1.1s' }}>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
              <div className="text-4xl font-bold text-secondary mb-2">1M+</div>
              <div className="text-muted-foreground">Messages Sent</div>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-400/5 border border-green-500/20">
              <div className="text-4xl font-bold text-green-500 mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
          </div>

          {/* CTA Section */}
          {!user && (
            <div className="text-center py-16 animate-fade-in" style={{ animationDelay: '1.4s' }}>
              <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-12 rounded-3xl border border-primary/20 shadow-2xl">
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Ready to start your journey?
                </h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join our growing community and experience the next generation of messaging
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button 
                    onClick={() => navigate('/auth')}
                    size="lg"
                    className="relative overflow-hidden group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-white border-0 px-8 py-6 text-lg font-semibold shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <Users className="mr-3 h-6 w-6" />
                    Create Account
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/auth')}
                    variant="outline"
                    size="lg"
                    className="border-primary/20 text-primary hover:bg-primary/5 px-8 py-6 text-lg font-semibold hover:scale-105 transition-all duration-300"
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;