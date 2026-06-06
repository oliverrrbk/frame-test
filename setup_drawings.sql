-- Create table for sketches/drawings
CREATE TABLE IF NOT EXISTS public.drawings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'Uden navn',
    type TEXT NOT NULL DEFAULT 'tldraw', -- 'tldraw' or 'upload'
    document_data JSONB, -- The vector JSON from tldraw
    image_url TEXT -- URL to preview image or uploaded PDF/Image
);

-- RLS policies
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all drawings" ON public.drawings
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own drawings" ON public.drawings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drawings" ON public.drawings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drawings" ON public.drawings
    FOR DELETE USING (auth.uid() = user_id);

-- Setup Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('drawings', 'drawings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'drawings'
CREATE POLICY "Public drawings view" ON storage.objects
    FOR SELECT USING (bucket_id = 'drawings');

CREATE POLICY "Authenticated users can upload drawings" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'drawings' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their drawings" ON storage.objects
    FOR UPDATE USING (bucket_id = 'drawings' AND auth.uid() = owner);

CREATE POLICY "Authenticated users can delete their drawings" ON storage.objects
    FOR DELETE USING (bucket_id = 'drawings' AND auth.uid() = owner);
