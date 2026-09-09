-- ============================================================
-- Play: account deletion (user-initiated, 90-day soft delete)
--
-- Same policy as PataSkillsV2 (see PataSkillsV2/sql/53_account_deletion.sql):
-- on the DEVICE the user's data is wiped immediately (local storage
-- cleared). On the SERVER we soft-delete: mark the record for deletion and
-- keep it TRASHED for 90 days, then a scheduled purge removes it for good.
--
-- Play has no real auth.uid() session for most users (play_accounts /
-- play_progress / play_devices are all anon-key, keyed by device_id and/or
-- email — see play_accounts.sql, play_devices.sql), so this is keyed by
-- device_id rather than auth.uid(). Called from lib/account.ts via
-- request_play_account_deletion(). Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.play_account_deletions (
  device_id     text PRIMARY KEY,
  email         text,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  purge_after   timestamptz NOT NULL DEFAULT now() + interval '90 days',
  status        text NOT NULL DEFAULT 'pending'   -- pending | purged
);

CREATE INDEX IF NOT EXISTS idx_play_account_deletions_email ON public.play_account_deletions(email);

ALTER TABLE public.play_account_deletions ENABLE ROW LEVEL SECURITY;

-- Same anon-key access pattern as the rest of play's tables — no
-- per-user auth is enforced elsewhere in this app.
DROP POLICY IF EXISTS "public select play_account_deletions" ON public.play_account_deletions;
CREATE POLICY "public select play_account_deletions"
  ON public.play_account_deletions FOR SELECT
  USING (true);

-- Mark this device (and its linked email, if any) for deletion. Idempotent
-- — re-calling just refreshes the 90-day window.
DROP FUNCTION IF EXISTS public.request_play_account_deletion(text, text);
CREATE FUNCTION public.request_play_account_deletion(
  p_device_id text,
  p_email     text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.play_account_deletions (device_id, email, requested_at, purge_after, status)
  VALUES (p_device_id, p_email, now(), now() + interval '90 days', 'pending')
  ON CONFLICT (device_id) DO UPDATE SET
    email        = COALESCE(EXCLUDED.email, play_account_deletions.email),
    requested_at = now(),
    purge_after  = now() + interval '90 days',
    status       = 'pending';
$$;

GRANT EXECUTE ON FUNCTION public.request_play_account_deletion(text, text) TO anon, authenticated;

-- ── Purge job (run on a schedule) ─────────────────────────────────────────
-- Deletes device/account rows whose 90-day window has elapsed. Wire to
-- pg_cron (Supabase → Database → Extensions → enable pg_cron), e.g. daily:
--   select cron.schedule('purge-play-accounts','0 3 * * *',$$ select public.purge_due_play_accounts() $$);
DROP FUNCTION IF EXISTS public.purge_due_play_accounts();
CREATE FUNCTION public.purge_due_play_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  n integer := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT device_id, email FROM public.play_account_deletions
     WHERE status = 'pending' AND purge_after <= now()
  LOOP
    DELETE FROM public.play_question_attempts WHERE device_id = r.device_id;
    DELETE FROM public.play_progress          WHERE device_id = r.device_id;
    DELETE FROM public.play_user_stats        WHERE device_id = r.device_id;
    DELETE FROM public.play_device_events     WHERE device_id = r.device_id;
    DELETE FROM public.play_devices           WHERE device_id = r.device_id;
    IF r.email IS NOT NULL THEN
      DELETE FROM public.play_accounts WHERE email = r.email;
      DELETE FROM public.play_progress WHERE email = r.email;
    END IF;
    UPDATE public.play_account_deletions SET status = 'purged' WHERE device_id = r.device_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$func$;
