-- SCRIPT FOR AVATARS (Profilbilleder)
-- Kopiér dette script og kør det i Supabase -> SQL Editor

-- 1. Tilføj avatar_url kolonnen til carpenters tabellen
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Opret en storage bucket til avatars (hvis den ikke findes)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Slet evt. gamle policies for at undgå konflikter
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;

-- 4. Opret policies for Storage Bucket
-- Alle kan læse (se) profilbillederne
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Kun indloggede brugere kan uploade filer
CREATE POLICY "Anyone can upload an avatar." 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Brugere kan opdatere deres egne filer (hvis filnavnet indeholder deres UID)
CREATE POLICY "Users can update their own avatar." 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Brugere kan slette deres egne filer
CREATE POLICY "Users can delete their own avatar." 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
