-- Enable real-time for messages table with full replica identity
ALTER TABLE public.messages REPLICA IDENTITY FULL;