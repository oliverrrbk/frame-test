-- ============================================================================
-- CHAT-NOTIFIKATIONER — kør i Supabase -> SQL Editor
-- ============================================================================
-- 1) Ulæst-sporing: last_read_at pr. deltager (så vi kan vise ulæst-badges).
-- 2) Push: trigger på nye chat-beskeder der kalder send-push-reminders, så
--    deltagerne (undtagen afsenderen) får en push-notifikation.
-- Additivt + idempotent. Rollback nederst.
-- ============================================================================

-- 1) Ulæst-sporing
ALTER TABLE public.chat_participants
    ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

-- Tillad at brugere kan opdatere deres egen last_read_at status via RLS
DROP POLICY IF EXISTS "Users can update their own last_read_at" ON public.chat_participants;
CREATE POLICY "Users can update their own last_read_at" ON public.chat_participants
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 2) Push ved ny chat-besked (samme mønster som tr_on_lead_push_notify)
CREATE OR REPLACE FUNCTION public.tr_on_chat_message_notify()
RETURNS TRIGGER AS $$
DECLARE
    service_role_key TEXT;
BEGIN
    -- Hent service-role-nøglen dynamisk fra cron-jobbet (undgår hardcoding).
    SELECT substring(command from 'Bearer ([^"]+)') INTO service_role_key
      FROM cron.job
     WHERE jobname = 'send-push-reminders-cron'
     LIMIT 1;

    PERFORM net.http_post(
        url := 'https://zjbjupovlgwlrvojusnr.supabase.co/functions/v1/send-push-reminders',
        body := jsonb_build_object(
            'type', 'chat_message',
            'thread_id', NEW.thread_id,
            'sender_id', NEW.sender_id,
            'message_id', NEW.id
        ),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_chat_message_push ON public.chat_messages;
CREATE TRIGGER tr_chat_message_push
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_on_chat_message_notify();

-- ============================================================================
-- ROLLBACK:
-- DROP TRIGGER IF EXISTS tr_chat_message_push ON public.chat_messages;
-- DROP FUNCTION IF EXISTS public.tr_on_chat_message_notify();
-- DROP POLICY IF EXISTS "Users can update their own last_read_at" ON public.chat_participants;
-- ALTER TABLE public.chat_participants DROP COLUMN IF EXISTS last_read_at;
-- ============================================================================
