import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';
import type { QuizQuestion, OptionChoice } from '@/types/quiz';

export interface QuestionAttempt {
  skillId: string;
  topicIndex: number;
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswerText: string;
  failCount: number;
  attemptCount: number;
  solved: boolean;
  lastMissedAt: string;
}

export interface MistakeItem {
  number: number;
  questionId: string;
  question: string;
  mistakeCount: number;
  correctAnswer: string;
  options: string[];
  solved: boolean;
}

function mistakesKey(skillId: string): string {
  return `@play/mistakes:${skillId}`;
}

type MistakeMap = Record<string, QuestionAttempt>;

async function readSkillMistakes(skillId: string): Promise<MistakeMap> {
  try {
    const raw = await AsyncStorage.getItem(mistakesKey(skillId));
    if (raw) {
      return JSON.parse(raw) as MistakeMap;
    }
  } catch {}
  return {};
}

async function writeSkillMistakes(skillId: string, data: MistakeMap): Promise<void> {
  try {
    await AsyncStorage.setItem(mistakesKey(skillId), JSON.stringify(data));
  } catch {}
}

function resolveCorrectAnswerText(question: QuizQuestion): string {
  if (Array.isArray(question.answers) && question.answers.length > question.correctAnswer) {
    const ans = question.answers[question.correctAnswer];
    if (ans) return ans;
  }
  if (Array.isArray(question.labels) && question.labels.length > question.correctAnswer) {
    const lbl = question.labels[question.correctAnswer];
    if (lbl) return lbl;
  }
  if (question.explanation && question.explanation.trim().length > 0) {
    return question.explanation;
  }
  return `Option ${question.correctAnswer + 1}`;
}

function extractOptionsStrings(question: QuizQuestion): string[] {
  if (Array.isArray(question.answers) && question.answers.length > 0) {
    return question.answers;
  }
  if (Array.isArray(question.labels) && question.labels.length > 0) {
    return question.labels;
  }
  return [];
}

/**
 * Records a question answered incorrectly. Increments failCount and attemptCount,
 * marks solved as false, and sets lastMissedAt.
 */
export async function recordQuestionFailure(
  skillId: string,
  topicIndex: number,
  question: QuizQuestion,
): Promise<void> {
  if (!skillId || !question || !question.id) return;

  const map = await readSkillMistakes(skillId);
  const prev = map[question.id];

  const updated: QuestionAttempt = {
    skillId,
    topicIndex,
    questionId: question.id,
    questionText: question.question || 'Question',
    options: extractOptionsStrings(question),
    correctAnswerText: resolveCorrectAnswerText(question),
    failCount: (prev?.failCount ?? 0) + 1,
    attemptCount: (prev?.attemptCount ?? 0) + 1,
    solved: false,
    lastMissedAt: new Date().toISOString(),
  };

  map[question.id] = updated;
  await writeSkillMistakes(skillId, map);

  // Background cloud mirror if user email is present
  void syncAttemptToCloud(updated);
}

/**
 * Records a question answered correctly. If it was previously missed,
 * marks it as solved so the user can see they overcame it.
 */
export async function recordQuestionSuccess(
  skillId: string,
  questionId: string,
): Promise<void> {
  if (!skillId || !questionId) return;

  const map = await readSkillMistakes(skillId);
  const prev = map[questionId];
  if (prev) {
    prev.solved = true;
    prev.attemptCount += 1;
    map[questionId] = prev;
    await writeSkillMistakes(skillId, map);
    void syncAttemptToCloud(prev);
  }
}

/**
 * Returns all recorded mistakes for a given skill, formatted for display.
 */
export async function getSkillMistakes(skillId: string): Promise<MistakeItem[]> {
  const map = await readSkillMistakes(skillId);
  const entries = Object.values(map);

  return entries
    .map((e, index) => ({
      number: index + 1,
      questionId: e.questionId,
      question: e.questionText,
      mistakeCount: e.failCount,
      correctAnswer: e.correctAnswerText,
      options: e.options,
      solved: e.solved,
    }))
    .sort((a, b) => b.mistakeCount - a.mistakeCount);
}

/**
 * Returns the total count of unique questions missed at least once for this skill.
 */
export async function getSkillMistakesCount(skillId: string): Promise<number> {
  const map = await readSkillMistakes(skillId);
  return Object.keys(map).length;
}

/**
 * Cloud sync mirror to Supabase, keyed by device_id via the
 * upsert_play_question_attempt RPC against play_question_attempts
 * (play's own device_id-first table -- see
 * supabase/play_question_attempts.sql). Previously this called
 * PataSkillsV2's public.question_attempts RPC, which declares skill_id
 * as uuid with a foreign key to PataSkillsV2's own skills table; play's
 * skill ids are text slugs, so every call failed silently on the uuid
 * cast and nothing ever reached Supabase. Returns whether the write
 * actually landed, so callers that need to know (bulk backup) can count
 * real successes instead of just firing and forgetting.
 */
async function syncAttemptToCloud(attempt: QuestionAttempt): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    if (!deviceId) return false;

    const { error } = await supabase.rpc('upsert_play_question_attempt', {
      p_device_id: deviceId,
      p_skill_id: attempt.skillId,
      p_topic_id: String(attempt.topicIndex),
      p_question_id: attempt.questionId,
      p_question_text: attempt.questionText,
      p_options: attempt.options,
      p_correct_answer_text: attempt.correctAnswerText,
      p_fail_count: attempt.failCount,
      p_attempt_count: attempt.attemptCount,
      p_solved: attempt.solved,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Manual "Backup now" entry point (Settings). Re-pushes every locally
 * recorded mistake across every skill, regardless of whether the earlier
 * live sync at record-time succeeded — this is the recovery path for
 * exactly the situation where record-time syncing was broken/undeployed
 * and local data piled up with nothing in Supabase. Device-keyed, so it
 * works with or without a linked email. Returns how many attempts were
 * successfully pushed out of how many were found locally.
 */
export async function pushAllMistakesToCloud(): Promise<{ pushed: number; total: number }> {
  let keys: readonly string[] = [];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch {
    return { pushed: 0, total: 0 };
  }

  const mistakeKeys = keys.filter((k) => k.startsWith('@play/mistakes:'));
  let pushed = 0;
  let total = 0;

  for (const key of mistakeKeys) {
    const skillId = key.slice('@play/mistakes:'.length);
    const map = await readSkillMistakes(skillId);
    for (const attempt of Object.values(map)) {
      total += 1;
      const ok = await syncAttemptToCloud(attempt);
      if (ok) pushed += 1;
    }
  }

  return { pushed, total };
}
