-- ============================================================================
-- SQL Migration: Gør sagschat (case) privat — kun deltagere
-- ============================================================================
-- BAGGRUND:
-- Tidligere (fix_chat_rls.sql) var BÅDE 'company'- og 'case'-tråde synlige for
-- hele firmaet. Det betød at alle kunne læse enhver sagschat. Det er forkert:
-- en sagschat skal kun kunne ses af dem der er deltagere på den.
--
-- ÆNDRING:
-- * 'company'-chat forbliver firma-bred (alle i firmaet).
-- * 'case'-chat behandles nu som 'dm': KUN deltagere (check_user_in_thread).
--
-- Deltagere tilføjes når en sagschat oprettes manuelt (aktuel bruger + tildelt
-- hold), og flere kan tilføjes bagefter via chat_participants INSERT
-- (WITH CHECK (true) — uændret fra setup_chat.sql).
--
-- check_user_in_thread() er SECURITY DEFINER og undgår RLS-rekursion mellem
-- chat_threads og chat_participants.
-- ============================================================================

-- 1. chat_threads SELECT
DROP POLICY IF EXISTS "Users can view threads they participate in or company threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Users can view accessible threads" ON public.chat_threads;

CREATE POLICY "Users can view accessible threads" ON public.chat_threads
    FOR SELECT USING (
        (type = 'company' AND company_id = public.get_user_company_id(auth.uid()))
        OR public.check_user_in_thread(id, auth.uid())
    );

-- 2. chat_participants SELECT
DROP POLICY IF EXISTS "Users can view participants for accessible threads" ON public.chat_participants;

CREATE POLICY "Users can view participants for accessible threads" ON public.chat_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id AND (
                (ct.type = 'company' AND ct.company_id = public.get_user_company_id(auth.uid()))
                OR public.check_user_in_thread(thread_id, auth.uid())
            )
        )
    );

-- 3. chat_messages SELECT
DROP POLICY IF EXISTS "Users can view messages in accessible threads" ON public.chat_messages;

CREATE POLICY "Users can view messages in accessible threads" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id AND (
                (ct.type = 'company' AND ct.company_id = public.get_user_company_id(auth.uid()))
                OR public.check_user_in_thread(thread_id, auth.uid())
            )
        )
    );

-- 4. chat_messages INSERT
DROP POLICY IF EXISTS "Users can insert their own messages into participating threads" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages into accessible threads" ON public.chat_messages;

CREATE POLICY "Users can insert their own messages into accessible threads" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id AND (
                (ct.type = 'company' AND ct.company_id = public.get_user_company_id(auth.uid()))
                OR public.check_user_in_thread(thread_id, auth.uid())
            )
        )
    );
