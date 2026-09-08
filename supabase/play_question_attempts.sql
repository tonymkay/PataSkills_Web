-- ============================================================
-- play_question_attempts — mistake-tracking server mirror for play.
--
-- lib/mistakes.ts was calling PataSkillsV2's public.question_attempts
-- RPC (upsert_question_attempt), which declares skill_id as uuid with
-- a foreign key to PataSkillsV2's own public.skills table. play's skill
-- ids are plain text slugs (e.g. "driving-theory") from play_curricula,
-- unrelated to that table -- every RPC call was failing server-side on
-- the uuid cast, silently swallowed by the try/catch in
-- syncAttemptToCloud(). Nothing from play ever actually landed in
-- Supabase. This is play's own table instead: device_id-first, skill_id
-- as text, matching the play_progress/play_user_stats convention.
-- ============================================================

CREATE TABLE IF NOT EXISTS play_question_attempts (
  device_id     text NOT NULL,
  skill_id      text NOT NULL,
  topic_id      text NOT NULL,
  question_id   text NOT NULL,
  question_text text,
  options       jsonb,
  correct_answer_text text,
  fail_count    integer NOT NULL DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 0,
  solved        boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_play_question_attempts_device ON play_question_attempts (device_id);
CREATE INDEX IF NOT EXISTS idx_play_question_attempts_skill ON play_question_attempts (device_id, skill_id);

ALTER TABLE play_question_attempts ENABLE ROW LEVEL SECURITY;

DO $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'play_question_attempts' and policyname = 'public select play_question_attempts'
  ) then
    create policy "public select play_question_attempts" on play_question_attempts for select using (true);
  end if;
end $$;

-- Absolute upsert (client sends accumulated local totals). Carries the
-- question text/options/correct answer too, so the dashboard's Mistakes
-- tab doesn't need to re-derive them from curriculum JSON.
DROP FUNCTION IF EXISTS upsert_play_question_attempt(text, text, text, text, text, jsonb, text, integer, integer, boolean);

CREATE FUNCTION upsert_play_question_attempt(
  p_device_id     text,
  p_skill_id      text,
  p_topic_id      text,
  p_question_id   text,
  p_question_text text,
  p_options       jsonb,
  p_correct_answer_text text,
  p_fail_count    integer,
  p_attempt_count integer,
  p_solved        boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  INSERT INTO play_question_attempts (
    device_id, skill_id, topic_id, question_id, question_text, options,
    correct_answer_text, fail_count, attempt_count, solved, updated_at
  )
  VALUES (
    p_device_id, p_skill_id, p_topic_id, p_question_id, p_question_text, p_options,
    p_correct_answer_text, COALESCE(p_fail_count, 0), COALESCE(p_attempt_count, 0),
    COALESCE(p_solved, false), now()
  )
  ON CONFLICT (device_id, question_id) DO UPDATE SET
    skill_id             = EXCLUDED.skill_id,
    topic_id             = EXCLUDED.topic_id,
    question_text        = EXCLUDED.question_text,
    options               = EXCLUDED.options,
    correct_answer_text  = EXCLUDED.correct_answer_text,
    fail_count           = EXCLUDED.fail_count,
    attempt_count        = EXCLUDED.attempt_count,
    solved               = EXCLUDED.solved,
    updated_at           = now();
END;
$func$;

GRANT EXECUTE ON FUNCTION
  upsert_play_question_attempt(text, text, text, text, text, jsonb, text, integer, integer, boolean)
  TO anon, authenticated;
