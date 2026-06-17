-- ============================================================================
-- SQL Migration: Setup Frame Chat System
-- ============================================================================
-- Purpose:
-- Creates tables, indexes, and RLS policies for a secure, real-time chat.
-- ============================================================================

-- 1. Create Threads Table
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dm', 'case', 'company')),
    related_lead_id BIGINT REFERENCES public.leads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Participants Table
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References carpenters/auth.users
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(thread_id, user_id)
);

-- 3. Create Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- References carpenters/auth.users
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice')),
    text_content TEXT,
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Indexes for High Performance Real-time Sync
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_thread ON public.chat_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON public.chat_messages(thread_id, created_at ASC);

-- 5. Helper Function for Policy Checks (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.check_user_in_thread(t_id UUID, u_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE thread_id = t_id AND user_id = u_id
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for chat_threads
DROP POLICY IF EXISTS "Users can view threads they participate in or company threads" ON public.chat_threads;
CREATE POLICY "Users can view threads they participate in or company threads" ON public.chat_threads
    FOR SELECT USING (
        type = 'company' 
        OR public.check_user_in_thread(id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can create threads" ON public.chat_threads;
CREATE POLICY "Users can create threads" ON public.chat_threads
    FOR INSERT WITH CHECK (true);

-- 8. RLS Policies for chat_participants
DROP POLICY IF EXISTS "Users can view participants for accessible threads" ON public.chat_participants;
CREATE POLICY "Users can view participants for accessible threads" ON public.chat_participants
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.check_user_in_thread(thread_id, auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id AND ct.type = 'company'
        )
    );

DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_participants;
CREATE POLICY "Users can insert participants" ON public.chat_participants
    FOR INSERT WITH CHECK (true);

-- 9. RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages in accessible threads" ON public.chat_messages;
CREATE POLICY "Users can view messages in accessible threads" ON public.chat_messages
    FOR SELECT USING (
        public.check_user_in_thread(thread_id, auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id AND ct.type = 'company'
        )
    );

DROP POLICY IF EXISTS "Users can insert their own messages into participating threads" ON public.chat_messages;
CREATE POLICY "Users can insert their own messages into participating threads" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND (
            public.check_user_in_thread(thread_id, auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.chat_threads ct
                WHERE ct.id = thread_id AND ct.type = 'company'
            )
        )
    );

-- 10. Enable Realtime for Chat Tables (only add if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'chat_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
  END IF;
END $$;
