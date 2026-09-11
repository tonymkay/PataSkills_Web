-- Verify/add UPDATE policy on play_accounts (idempotent).
-- Insert/select policies already exist; without this, a same-session
-- upsert after account creation fails RLS permission-denied and is
-- silently swallowed by lib/keys.ts write()'s catch block.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'play_accounts'
      and policyname = 'play_accounts_update_policy'
  ) then
    create policy play_accounts_update_policy
      on public.play_accounts
      for update
      using (true)
      with check (true);
  end if;
end $$;
