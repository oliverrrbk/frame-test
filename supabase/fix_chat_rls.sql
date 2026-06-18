-- SQL Migration: Fix Chat RLS Policies
-- Purpose: Allow all users in a company to read/write 'case' and 'company' chats. Restrict 'dm' to participants only.

-- 1. Helper function to get a user's company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id(u_id UUID)
RETURNS UUID SECURITY DEFINER AS $$
DECLARE
  comp_id UUID;
BEGIN
  SELECT COALESCE(company_id, id) INTO comp_id FROM public.carpenters WHERE id = u_id;
  RETURN comp_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Update chat_threads policy
DROP POLICY IF EXISTS "Users can view threads they participate in or company threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can view accessible threads" ON public.chat_threads;

CREATE POLICY "Users can view accessible threads" ON public.chat_threads
    FOR SELECT USING (
        (type IN ('company', 'case') AND company_id = public.get_user_company_id(auth.uid()))
        OR public.check_user_in_thread(id, auth.uid())
    );

-- 3. Update chat_participants policy
DROP POLICY IF EXISTS "Users can view participants for accessible threads" ON public.chat_participants;

CREATE POLICY "Users can view participants for accessible threads" ON public.chat_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id AND (
                (ct.type IN ('company', 'case') AND ct.company_id = public.get_user_company_id(auth.uid()))
                OR public.check_user_in_thread(thread_id, auth.uid())
            )
        )
    );

-- 4. Update chat_messages policy
DROP POLICY IF EXISTS "Users can view messages in accessible threads" ON public.chat_messages;

CREATE POLICY "Users can view messages in accessible threads" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id AND (
                (ct.type IN ('company', 'case') AND ct.company_id = public.get_user_company_id(auth.uid()))
                OR public.check_user_in_thread(thread_id, auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert their own messages into participating threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages into accessible threads" ON public.chat_messages;

CREATE POLICY "Users can insert their own messages into accessible threads" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id AND (
                (ct.type IN ('company', 'case') AND ct.company_id = public.get_user_company_id(auth.uid()))
                OR public.check_user_in_thread(thread_id, auth.uid())
            )
        )
    );
