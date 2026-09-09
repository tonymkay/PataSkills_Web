-- Persistent per-account key balance. This is the source of truth for a
-- logged-in user's key balance once they've ever restored/logged in on any
-- device — it is kept in sync on every spend/grant (see lib/keys.ts write())
-- and read back on every login (lib/restore.ts), so re-logging in never
-- re-grants keys that have already been spent.

create table if not exists play_accounts (
  email text primary key,
  balance integer not null default 0,
  is_premium boolean not null default false,
  reset_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table play_accounts enable row level security;

-- Matches the app's existing anon-key access pattern (e.g. play_signs'
-- admin-swap policy) — no per-user auth is enforced elsewhere in this app.
drop policy if exists "public select play_accounts" on play_accounts;
create policy "public select play_accounts"
  on play_accounts for select
  using (true);

drop policy if exists "public insert play_accounts" on play_accounts;
create policy "public insert play_accounts"
  on play_accounts for insert
  with check (true);

drop policy if exists "public update play_accounts" on play_accounts;
create policy "public update play_accounts"
  on play_accounts for update
  using (true)
  with check (true);

-- Anon (no real auth in this app) still needs to write balance/reset_at
-- routinely — lib/keys.ts's write() is the normal cloud-backup path for
-- spends, ad-reward grants, quest grants, and daily resets, and that must
-- keep working. What must NOT be anon-writable is is_premium flipping to
-- true with no purchase behind it — that's the actual exploit the open
-- policies above allow (set any email's is_premium=true via a raw anon
-- Supabase call). Only the service-role callers (paystack-webhook,
-- revenuecat-webhook) — and, going forward, nothing else — may grant it.
create or replace function guard_play_accounts_premium_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_premium = true and (tg_op = 'INSERT' or old.is_premium is distinct from true) then
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
      raise exception 'is_premium can only be granted by a trusted server process';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists play_accounts_premium_guard on play_accounts;
create trigger play_accounts_premium_guard
  before insert or update on play_accounts
  for each row execute function guard_play_accounts_premium_grant();
