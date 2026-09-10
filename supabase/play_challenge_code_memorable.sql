-- Challenge Corner: memorable invite codes ("TOKYO_234" instead of the
-- opaque 6-char alphanumeric code). Apply AFTER play_challenge_invite_code.sql.
-- Replaces generate_play_challenge_invite_code() only — play_create_challenge,
-- play_join_challenge_by_code, and the invite_code column/index are unchanged.

create or replace function public.generate_play_challenge_invite_code()
returns text
language plpgsql
as $$
declare
  -- Cities + animals, all <=6 letters, no ambiguous/long words (no
  -- CROCODILE-style entries). Kept short so the whole code reads at a
  -- glance and is easy to say out loud over a call.
  v_words text[] := array[
    'TOKYO','OSLO','LIMA','CAIRO','DELHI','ACCRA','MALTA','PARIS','ROME',
    'MILAN','MADRID','SEOUL','DUBAI','DOHA','JEDDA',
    'LION','PUMA','TIGER','EAGLE','HAWK','WOLF','BEAR','FOX','DEER',
    'ZEBRA','OTTER','ROBIN','HERON','CRANE','SWIFT','GECKO','MOOSE'
  ];
  v_word text;
  v_number text;
  v_code text;
  v_exists boolean;
begin
  loop
    v_word := v_words[1 + floor(random() * array_length(v_words, 1))::int];
    v_number := lpad(floor(random() * 1000)::int::text, 3, '0');
    v_code := v_word || '_' || v_number;
    select exists(
      select 1 from public.play_challenges where invite_code = v_code
    ) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;
