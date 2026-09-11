-- ============================================================
-- Play: play_user_stats schema/RLS re-assertion (belt-and-braces)
--
-- Companion to play_user_stats.sql / play_user_stats_device_first_fix.sql.
-- Both already define device_id as primary key and all three RLS
-- policies on paper -- this migration doesn't change that design, it just
-- re-asserts it defensively in case the device_first_fix migration didn't
-- fully land (e.g. a partial run). Every step is idempotent / guarded, so
-- it's a safe no-op if everything already landed correctly, and a real
-- repair if it didn't. Same pattern as play_accounts_rls_verify.sql.
-- ============================================================

-- Re-assert device_id exists and is the primary key. No-op if
-- device_first_fix.sql already applied this.
alter table if exists play_user_stats add column if not exists device_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'play_user_stats'::regclass
      and contype = 'p'
      and conkey = (select array_agg(attnum) from pg_attribute
                    where attrelid = 'play_user_stats'::regclass and attname = 'device_id')
  ) then
    -- No primary key on device_id yet. Backfill any null device_id rows
    -- with a placeholder (same approach as device_first_fix.sql) so the
    -- NOT NULL + PRIMARY KEY below can actually be applied.
    update play_user_stats set device_id = 'legacy-email-only-' || coalesce(email, gen_random_uuid()::text)
      where device_id is null;

    if exists (
      select 1 from pg_constraint
      where conrelid = 'play_user_stats'::regclass and contype = 'p'
    ) then
      execute (
        select 'alter table play_user_stats drop constraint ' || conname
        from pg_constraint
        where conrelid = 'play_user_stats'::regclass and contype = 'p'
      );
    end if;

    alter table play_user_stats alter column device_id set not null;
    alter table play_user_stats add primary key (device_id);
  end if;
end $$;

alter table if exists play_user_stats alter column email drop not null;

create index if not exists idx_play_user_stats_email on play_user_stats(email);

alter table if exists play_user_stats enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'play_user_stats' and policyname = 'public select play_user_stats'
  ) then
    create policy "public select play_user_stats" on play_user_stats for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'play_user_stats' and policyname = 'public insert play_user_stats'
  ) then
    create policy "public insert play_user_stats" on play_user_stats for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'play_user_stats' and policyname = 'public update play_user_stats'
  ) then
    create policy "public update play_user_stats" on play_user_stats for update using (true) with check (true);
  end if;
end $$;
