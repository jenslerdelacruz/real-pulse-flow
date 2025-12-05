-- Make chat-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

-- Drop existing storage policies for chat-images if any
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public chat images access" ON storage.objects;

-- Create RLS policies for chat-images bucket
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view chat images in their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE m.image_url LIKE '%' || storage.objects.name || '%'
    AND cp.user_id = auth.uid()
  )
);