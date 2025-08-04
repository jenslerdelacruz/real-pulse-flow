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
    const roomName = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const jitsiRoomUrl = `https://meet.jit.si/${roomName}`;
    
    if (onRoomCreated) {
      onRoomCreated(jitsiRoomUrl);
    }
    
    return roomName;
  };

  const initJitsi = (roomName: string) => {
    if (!jitsiContainerRef.current) return;

    // Load Jitsi Meet API script if not already loaded
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        startJitsiMeeting(roomName);
      };
      document.head.appendChild(script);
    } else {
      startJitsiMeeting(roomName);
    }
  };

  const startJitsiMeeting = (roomName: string) => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

    const options = {
      roomName: roomName,
      width: '100%',
      height: 400,
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'download', 'help', 'mute-everyone', 'security'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
      }
    };

    const jitsiApi = new window.JitsiMeetExternalAPI('meet.jit.si', options);
    
    jitsiApi.addEventListener('participantJoined', (participant: any) => {
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
      setParticipants(prev => prev.filter(p => p.id !== participant.id));
    });

    jitsiApi.addEventListener('videoConferenceJoined', () => {
      setIsJoined(true);
      toast({
        title: "Joined call",
        description: "You've successfully joined the video call",
      });
    });

    jitsiApi.addEventListener('videoConferenceLeft', () => {
      setIsJoined(false);
      onClose();
    });

    jitsiApi.addEventListener('audioMuteStatusChanged', (event: any) => {
      setIsMicOn(!event.muted);
    });

    jitsiApi.addEventListener('videoMuteStatusChanged', (event: any) => {
      setIsCameraOn(!event.muted);
    });

    setApi(jitsiApi);
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
        // Extract room name from Jitsi URL
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
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Call
            {participants.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({participants.length + 1} participants)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div ref={jitsiContainerRef} className="w-full h-[400px] bg-secondary rounded-lg" />
          
          {isJoined && (
            <div className="flex justify-center gap-4">
              <Button
                variant={isCameraOn ? "default" : "destructive"}
                size="sm"
                onClick={toggleCamera}
              >
                {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              
              <Button
                variant={isMicOn ? "default" : "destructive"}
                size="sm"
                onClick={toggleMic}
              >
                {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={leaveCall}
              >
                <PhoneOff className="h-4 w-4" />
                Leave Call
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};