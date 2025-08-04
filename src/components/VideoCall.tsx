import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  roomUrl?: string;
  onRoomCreated?: (roomUrl: string) => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  isOpen,
  onClose,
  roomUrl,
  onRoomCreated
}) => {
  const { toast } = useToast();
  const callFrameRef = useRef<HTMLDivElement>(null);
  const [callFrame, setCallFrame] = useState<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);

  const createRoom = async () => {
    try {
      // Create a temporary room (this would normally be done on your backend)
      const roomName = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempRoomUrl = `https://lovable.daily.co/${roomName}`;
      
      if (onRoomCreated) {
        onRoomCreated(tempRoomUrl);
      }
      
      return tempRoomUrl;
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create video call room",
        variant: "destructive",
      });
      return null;
    }
  };

  const joinCall = async (url: string) => {
    if (!callFrameRef.current) return;

    try {
      const frame = DailyIframe.createFrame(callFrameRef.current, {
        showLeaveButton: true,
        iframeStyle: {
          width: '100%',
          height: '400px',
          border: 'none',
          borderRadius: '8px',
        },
      });

      frame.on('joined-meeting', () => {
        setIsJoined(true);
        toast({
          title: "Joined call",
          description: "You've successfully joined the video call",
        });
      });

      frame.on('left-meeting', () => {
        setIsJoined(false);
        onClose();
      });

      frame.on('participant-joined', (event: any) => {
        setParticipants(prev => [...prev, event.participant]);
      });

      frame.on('participant-left', (event: any) => {
        setParticipants(prev => prev.filter(p => p.session_id !== event.participant.session_id));
      });

      frame.on('error', (event: any) => {
        console.error('Daily error:', event);
        toast({
          title: "Call error",
          description: "Something went wrong with the video call",
          variant: "destructive",
        });
      });

      await frame.join({ url });
      setCallFrame(frame);
      
    } catch (error) {
      console.error('Error joining call:', error);
      toast({
        title: "Error",
        description: "Failed to join video call",
        variant: "destructive",
      });
    }
  };

  const leaveCall = () => {
    if (callFrame) {
      callFrame.leave();
      callFrame.destroy();
      setCallFrame(null);
    }
    setIsJoined(false);
    onClose();
  };

  const toggleCamera = () => {
    if (callFrame) {
      callFrame.setLocalVideo(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = () => {
    if (callFrame) {
      callFrame.setLocalAudio(!isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initCall = async () => {
        const url = roomUrl || await createRoom();
        if (url) {
          await joinCall(url);
        }
      };
      initCall();
    }

    return () => {
      if (callFrame) {
        callFrame.destroy();
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
          <div ref={callFrameRef} className="w-full h-[400px] bg-secondary rounded-lg" />
          
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