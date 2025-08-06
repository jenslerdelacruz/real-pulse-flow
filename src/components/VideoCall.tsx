import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  roomUrl?: string;
  onRoomCreated?: (roomUrl: string) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const VideoCall: React.FC<VideoCallProps> = ({
  isOpen,
  onClose,
  roomUrl,
  onRoomCreated
}) => {
  const { toast } = useToast();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);

  const createRoom = () => {
    const roomName = `chatapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const jitsiRoomUrl = `https://meet.jit.si/${roomName}`;
    
    if (onRoomCreated) {
      onRoomCreated(jitsiRoomUrl);
    }
    
    return roomName;
  };

  const initJitsi = (roomName: string) => {
    console.log('Initializing Jitsi with room:', roomName);
    if (!jitsiContainerRef.current) {
      console.error('Jitsi container ref not found');
      return;
    }

    if (!window.JitsiMeetExternalAPI) {
      console.log('Loading Jitsi Meet API script...');
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        console.log('Jitsi script loaded successfully');
        startJitsiMeeting(roomName);
      };
      script.onerror = (error) => {
        console.error('Failed to load Jitsi script:', error);
        toast({
          title: "Error",
          description: "Failed to load video call. Please check your internet connection.",
        });
      };
      document.head.appendChild(script);
    } else {
      console.log('Jitsi API already available');
      startJitsiMeeting(roomName);
    }
  };

  const startJitsiMeeting = (roomName: string) => {
    console.log('Starting Jitsi meeting with room:', roomName);
    if (!jitsiContainerRef.current) {
      console.error('Container not found when starting meeting');
      return;
    }
    if (!window.JitsiMeetExternalAPI) {
      console.error('Jitsi API not available when starting meeting');
      toast({
        title: "Error",
        description: "Jitsi API could not be loaded. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      const options = {
        roomName: roomName,
        width: '100%',
        height: 400,
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          enableWelcomePage: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'hangup', 'chat', 'filmstrip', 'tileview'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          SETTINGS_SECTIONS: ['devices'],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        },
        userInfo: {
          displayName: `User-${Math.random().toString(36).substr(2, 5)}`
        }
      };
      
      console.log('Creating Jitsi API with options:', options);
      const jitsiApi = new window.JitsiMeetExternalAPI('meet.jit.si', options);
      console.log('Jitsi API created successfully');
      
      jitsiApi.addEventListener('participantJoined', (participant: any) => {
        console.log('Participant joined:', participant);
        setParticipants(prev => [...prev, participant]);
        if (!isJoined) {
          setIsJoined(true);
          toast({
            title: "Joined call",
            description: "You've successfully joined the video call",
          });
        }
      });

      jitsiApi.addEventListener('participantLeft', (participant: any) => {
        console.log('Participant left:', participant);
        setParticipants(prev => prev.filter(p => p.id !== participant.id));
      });

      jitsiApi.addEventListener('videoConferenceJoined', () => {
        console.log('Video conference joined successfully');
        setIsJoined(true);
        toast({
          title: "Joined call",
          description: "You've successfully joined the video call",
        });
      });

      jitsiApi.addEventListener('videoConferenceLeft', () => {
        console.log('Video conference left');
        setIsJoined(false);
        onClose();
      });

      jitsiApi.addEventListener('audioMuteStatusChanged', (event: any) => {
        setIsMicOn(!event.muted);
      });

      jitsiApi.addEventListener('videoMuteStatusChanged', (event: any) => {
        setIsCameraOn(!event.muted);
      });

      jitsiApi.addEventListener('readyToClose', () => {
        console.log('Jitsi ready to close');
        setIsJoined(false);
        onClose();
      });

      setApi(jitsiApi);
    } catch (error) {
      console.error('Error creating Jitsi API:', error);
      toast({
        title: "Error",
        description: "Failed to initialize video call. Please try again.",
        variant: "destructive"
      });
    }
  };

  const leaveCall = () => {
    if (api) {
      api.dispose();
      setApi(null);
    }
    setIsJoined(false);
    onClose();
  };

  const toggleCamera = () => {
    if (api) {
      api.executeCommand('toggleVideo');
    }
  };

  const toggleMic = () => {
    if (api) {
      api.executeCommand('toggleAudio');
    }
  };

  useEffect(() => {
    if (isOpen) {
      let roomName: string;
      if (roomUrl) {
        const urlParts = roomUrl.split('/');
        roomName = urlParts[urlParts.length - 1];
      } else {
        roomName = createRoom();
      }
      
      initJitsi(roomName);
    }

    return () => {
      if (api) {
        api.dispose();
      }
    };
  }, [isOpen, roomUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-gradient-to-br from-background via-secondary/20 to-primary/5 border-primary/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Video className="h-6 w-6 text-primary animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Video Call
              </span>
            </div>
            {participants.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full animate-fade-in">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">
                  {participants.length + 1} participants
                </span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="relative">
            <div ref={jitsiContainerRef} className="w-full h-[450px] bg-gradient-to-br from-secondary/50 to-secondary/20 rounded-xl border border-primary/10 shadow-inner overflow-hidden" />
            {!isJoined && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 backdrop-blur-sm rounded-xl">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground">Connecting to call...</p>
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {isJoined && (
            <div className="flex justify-center gap-4 p-4 bg-secondary/30 rounded-xl backdrop-blur-sm border border-primary/10">
              <Button
                variant={isCameraOn ? "default" : "destructive"}
                size="lg"
                onClick={toggleCamera}
                className="relative overflow-hidden group hover:scale-110 transition-all duration-300 shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isMicOn ? "default" : "destructive"}
                size="lg"
                onClick={toggleMic}
                className="relative overflow-hidden group hover:scale-110 transition-all duration-300 shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant="destructive"
                size="lg"
                onClick={leaveCall}
                className="relative overflow-hidden group hover:scale-110 transition-all duration-300 shadow-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <PhoneOff className="h-5 w-5 mr-2" />
                Leave Call
              </Button>
            </div>
          )}
          
          {roomUrl && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-2">Share this link to invite others:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-secondary rounded text-sm font-mono break-all">{roomUrl}</code>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(roomUrl);
                    toast({
                      title: "Link copied!",
                      description: "Invite link copied to clipboard",
                    });
                  }}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};