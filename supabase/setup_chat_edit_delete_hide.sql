-- ============================================================================
-- SQL Migration: Chat — rediger/fortryd beskeder + skjul samtaler pr. bruger
-- Kør i Supabase -> SQL Editor.  Idempotent.  Additiv (rører ingen data).
-- ============================================================================
-- BAGGRUND:
--   1) En afsender skal kunne REDIGERE eller FORTRYDE (slette for alle) sin egen
--      besked. Beskeder slettes blødt (deleted_at) så tråden bevarer rækkefølgen
--      og klienten kan vise "Besked slettet".
--   2) En bruger skal kunne SKJULE en samtale for SIG SELV (swipe → slet) uden at
--      slette den for de andre. Det gøres med hidden_at på brugerens egen
--      chat_participants-række. En ny besked efter hidden_at viser tråden igen
--      (klienten sammenligner hidden_at med seneste besked).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Nye kolonner
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_messages
    ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMPTZ,   -- sat når en besked redigeres
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;   -- sat når afsenderen fortryder (blød sletning)

ALTER TABLE public.chat_participants
    ADD COLUMN IF NOT EXISTS hidden_at  TIMESTAMPTZ;   -- sat når brugeren skjuler samtalen for sig selv

-- ----------------------------------------------------------------------------
-- 2) UPDATE-policy på chat_messages: afsenderen må ændre SIN egen besked
-- ----------------------------------------------------------------------------
-- Dækker både redigering (text_content/edited_at) og fortryd (deleted_at).
-- sender_id må ikke kunne skiftes til en anden (WITH CHECK).
DROP POLICY IF EXISTS "Senders can update their own messages" ON public.chat_messages;
CREATE POLICY "Senders can update their own messages" ON public.chat_messages
    FOR UPDATE
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

-- ----------------------------------------------------------------------------
-- 3) UPDATE-policy på chat_participants: brugeren må ændre SIN egen række
-- ----------------------------------------------------------------------------
-- Bruges til at sætte/ophæve hidden_at (og last_read_at sættes allerede via samme række).
DROP POLICY IF EXISTS "Users can update their own participant row" ON public.chat_participants;
CREATE POLICY "Users can update their own participant row" ON public.chat_participants
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4) Realtime: fuld replica identity, så UPDATE-payloads (rediger/fortryd) kan
--    leveres med rækkens data til klienten. chat_messages er allerede i
--    supabase_realtime-publikationen (jf. setup_chat.sql).
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- ============================================================================
-- ROLLBACK (kør kun hvis nødvendigt):
--   DROP POLICY IF EXISTS "Senders can update their own messages" ON public.chat_messages;
--   DROP POLICY IF EXISTS "Users can update their own participant row" ON public.chat_participants;
--   ALTER TABLE public.chat_messages DROP COLUMN IF EXISTS edited_at, DROP COLUMN IF EXISTS deleted_at;
--   ALTER TABLE public.chat_participants DROP COLUMN IF EXISTS hidden_at;
-- ============================================================================
