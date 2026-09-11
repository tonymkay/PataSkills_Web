-- ============================================================
-- Play: atomic key-balance operations
--
-- Closes the multi-device race / stale-overwrite gap in lib/keys.ts's
-- write(): that function pushes an absolute balance ("set balance to N"),
-- not a delta -- two devices spending or being granted keys around the
-- same time don't conflict, they race to overwrite each other's number,
-- and a stale higher local cache re-syncing after a legitimate spend can
-- actually push the balance back UP. These two RPCs replace "read, compute
-- locally, push absolute value" with a single atomic database operation
-- for the two things that must never race: spending and granting.
--
-- Called from lib/keys.ts's spendKey() / grantBonusKey(). Safe to re-run.
-- ============================================================

-- Atomic, race-safe spend of exactly 1 key. Returns the new balance, or
-- NULL if there was nothing to spend (balance already 0, or no account
-- row exists yet for this email) -- callers must treat NULL as "spend
-- rejected", not "balance is 0". Premium accounts never call this (client
-- checks isPremium first) so there's no unlimited-balance case to handle
-- here.
DROP FUNCTION IF EXISTS public.spend_play_key(text);
CREATE FUNCTION public.spend_play_key(p_email text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.play_accounts
     SET balance = balance - 1, updated_at = now()
   WHERE email = p_email AND balance > 0
  RETURNING balance;
$$;

GRANT EXECUTE ON FUNCTION public.spend_play_key(text) TO anon, authenticated;

-- Atomic grant of p_amount keys. Creates the account row if it doesn't
-- exist yet (first grant before any login/purchase has ever synced),
-- otherwise atomically increments the existing balance. Returns the new
-- balance.
DROP FUNCTION IF EXISTS public.grant_play_keys(text, integer);
CREATE FUNCTION public.grant_play_keys(p_email text, p_amount integer)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.play_accounts (email, balance, updated_at)
  VALUES (p_email, p_amount, now())
  ON CONFLICT (email) DO UPDATE
    SET balance = public.play_accounts.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING balance;
$$;

GRANT EXECUTE ON FUNCTION public.grant_play_keys(text, integer) TO anon, authenticated;
