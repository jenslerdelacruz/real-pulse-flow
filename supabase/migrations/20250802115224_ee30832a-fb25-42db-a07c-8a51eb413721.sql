-- Fix infinite recursion in conversation_participants policies

-- First, drop the existing policies that are causing recursion
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON public.conversation_participants;

-- Create a security definer function to check if user is participant in conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conversation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversation_uuid 
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a security definer function to check if user created the conversation
CREATE OR REPLACE FUNCTION public.is_conversation_creator(conversation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_uuid 
    AND created_by = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policies without recursion
CREATE POLICY "Users can view participants of conversations they participate in" 
ON public.conversation_participants 
FOR SELECT 
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can add participants to conversations they created" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (public.is_conversation_creator(conversation_id, auth.uid()));

-- Allow users to add themselves to conversations (for joining)
CREATE POLICY "Users can add themselves as participants" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);