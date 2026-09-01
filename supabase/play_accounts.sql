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
create policy "public select play_accounts"
  on play_accounts for select
  using (true);

create policy "public insert play_accounts"
  on play_accounts for insert
  with check (true);

create policy "public update play_accounts"
  on play_accounts for update
  using (true)
  with check (true);
