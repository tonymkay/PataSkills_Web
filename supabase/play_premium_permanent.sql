
-- ============================================================
-- play_premium_permanent.sql
-- Never-expiring Premium for play_accounts (ported from the old app's
-- migration 82 `premium_permanent`), plus the guard that makes it stick.
--
-- Why this exists:
--   * play_accounts had no way to say "permanent", so old permanent
--     accounts arrived as plain is_premium and were exposed to demotion.
--   * lib/keys.ts write() upserts is_premium from the DEVICE's local state
--     on every spend/grant/reset. A device with free local state therefore
--     overwrote a granted is_premium=true with false. The old guard only
--     blocked false -> true, never true -> false.
--
-- After this migration:
--   * premium_permanent = true rows can only be changed by a trusted
--     server process (service role: webhooks, SQL run with the claim below).
--   * Client writes (anon key) can never flip is_premium off on a
--     permanent row, and can never set premium_permanent themselves.
--   * Existing behaviour is unchanged for everyone else: clients still
--     cannot grant is_premium=true.
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.play_accounts
  ADD COLUMN IF NOT EXISTS premium_permanent boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_play_accounts_premium_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  caller_role text;
BEGIN
  -- PostgREST exposes the JWT role either as the legacy per-claim setting
  -- or inside the request.jwt.claims JSON; read both.
  caller_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', ''),
    ''
  );

  -- Trusted server process: anything goes.
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Client (anon) writes from here on.

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_premium = true THEN
      RAISE EXCEPTION 'is_premium can only be granted by a trusted server process';
    END IF;
    NEW.premium_permanent := false;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.is_premium = true AND OLD.is_premium IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'is_premium can only be granted by a trusted server process';
  END IF;

  -- premium_permanent is never client-writable.
  NEW.premium_permanent := coalesce(OLD.premium_permanent, false);

  -- A permanent row cannot be demoted by a device pushing its local state.
  IF OLD.premium_permanent = true THEN
    NEW.is_premium := true;
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS play_accounts_premium_guard ON public.play_accounts;
CREATE TRIGGER play_accounts_premium_guard
  BEFORE INSERT OR UPDATE ON public.play_accounts
  FOR EACH ROW EXECUTE FUNCTION public.guard_play_accounts_premium_grant();

-- ------------------------------------------------------------
-- Running grants by hand (Supabase SQL editor)
-- The SQL editor is not the service role, so the guard treats it as a
-- client. Wrap manual premium writes in a transaction that sets the
-- service-role claim for that transaction only:
--
--   BEGIN;
--   SELECT set_config('request.jwt.claim.role', 'service_role', true);
--   ... your INSERT / UPDATE on play_accounts ...
--   COMMIT;
-- ------------------------------------------------------------

-- Verify
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_name = 'play_accounts' AND column_name = 'premium_permanent';

SELECT tgname, tgenabled
  FROM pg_trigger
 WHERE tgname = 'play_accounts_premium_guard';
