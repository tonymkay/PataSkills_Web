-- Challenge Corner: invite codes for play_tournaments.
-- Adds a short human-typeable code (+ optional email lock, + expiry) so a
-- real tournament creator can share access with a specific person instead
-- of everyone always racing bots. Apply AFTER play_tournament_rpcs.sql.

alter table public.play_tournaments
  add column if not exists invite_code text,
  add column if not exists invite_email text,
  add column if not exists expires_at timestamptz;

create unique index if not exists play_tournaments_invite_code_idx
  on public.play_tournaments (invite_code)
  where invite_code is not null;

-- 6-char, uppercase, excludes ambiguous chars (0/O, 1/I) — safe to read aloud
-- or type from a screenshot. Retries on the (very rare) collision.
create or replace function public.generate_play_invite_code()
returns text
language plpgsql
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, (floor(random() * length(v_chars)) + 1)::int, 1);
    end loop;
    select exists(select 1 from public.play_tournaments where invite_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;
