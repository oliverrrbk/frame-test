-- SQL Migration: Setup Chat Media Storage Bucket
-- Purpose: Creates a storage bucket for chat attachments (images, voice notes) and sets up RLS policies.

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Chat media is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat media" ON storage.objects;

-- 4. Create Policies
-- Read access: Any authenticated user can read chat media (or public, since bucket is public)
CREATE POLICY "Chat media is publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat_media' );

-- Insert access: Any authenticated user can upload
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'chat_media' );

-- Update access: Owner only
CREATE POLICY "Users can update their own chat media"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'chat_media' AND auth.uid() = owner );

-- Delete access: Owner only
CREATE POLICY "Users can delete their own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'chat_media' AND auth.uid() = owner );
