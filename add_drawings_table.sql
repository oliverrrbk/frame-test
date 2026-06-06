-- Create drawings table
CREATE TABLE IF NOT EXISTS public.drawings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    name text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id bigint REFERENCES public.leads(id) ON DELETE CASCADE,
    type text DEFAULT 'tldraw', -- 'tldraw', 'upload', etc.
    document_data jsonb, -- The vector JSON data from tldraw
    image_url text -- For future use, if we want to export a thumbnail
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own drawings
CREATE POLICY "Users can insert their own drawings"
ON public.drawings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own drawings
CREATE POLICY "Users can view their own drawings"
ON public.drawings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own drawings
CREATE POLICY "Users can update their own drawings"
ON public.drawings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own drawings
CREATE POLICY "Users can delete their own drawings"
ON public.drawings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
