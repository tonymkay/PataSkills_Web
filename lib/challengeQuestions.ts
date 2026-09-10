/**
 * The SHARED question set for a challenge race — every member samples with
 * the challenge's seed over the same curriculum, so everyone races
 * identical questions in identical order. Ported from pataskillsv2's
 * lib/practiceChallenge.ts (buildChallengeQuestions/makeRaceSeed only —
 * the practice-mistakes half of that file has no Play equivalent).
 *
 * Adapted for Play: pulls from loadRemoteCurriculum + deriveTrack('full')
 * instead of a per-skill local topic cache — Play has one curriculum per
 * slug, not a multi-skill catalog with per-skill downloaded content.
 * `topicIndex` indexes into the curriculum's 'full'-track QUIZ sessions
 * only (reading sessions have no `.questions` and are skipped), same
 * "one topic the creator picked, or every topic is fair game" semantics
 * as the old app's target_topic_count.
 */
import type { QuizQuestion } from '@/types/quiz';
import { loadRemoteCurriculum, deriveTrack } from '@/lib/curriculum';
import { loadSignAssets, loadSignPairs } from '@/lib/signs';
import { hydrateQuestionsList } from '@/utils/hydrateQuestions';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A fresh random seed for a client-simulated race (Companion/Scout). */
export function makeRaceSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Quiz-only topic list for a curriculum's 'full' track — the pool
 *  buildChallengeQuestions() and any topic picker (challenge-create.tsx)
 *  both index into. Reading-kind sessions are dropped: they have no
 *  `.questions` to race on. */
export async function getChallengeTopics(
  slug: CurriculumSlug,
): Promise<{ title: string; questions: QuizQuestion[] }[]> {
  const remote = await loadRemoteCurriculum(slug);

  // Same image-hydration downloadSession() already does for normal runs
  // (direct sign-key lookup + pairId/signRef resolution) — loadRemoteCurriculum()
  // alone only resolves the plural `images[]` field via resolvePairedSignImages(),
  // never the singular `image` field a single-image pairId/signRef question
  // relies on. Without this, those questions render with no image at all in
  // a challenge and TwoImageCard falls back to its generic SVG sign.
  const hasSigns = remote.signs.length > 0;
  const assets = hasSigns ? await loadSignAssets() : {};
  const pairs = hasSigns ? await loadSignPairs(assets) : {};
  const hydratedQuestions = hydrateQuestionsList(remote.questions, assets, pairs);

  const sessions = deriveTrack(hydratedQuestions, remote.signs, 'full', remote.tracks);
  return sessions
    .filter((s): s is Extract<typeof s, { kind: 'quiz' }> => s.kind === 'quiz')
    .map((s) => ({ title: s.title, questions: s.questions }));
}

export async function buildChallengeQuestions(
  slug: CurriculumSlug,
  seed: number,
  count: number,
  topicIndex?: number | null,
): Promise<QuizQuestion[]> {
  const topics = await getChallengeTopics(slug);
  if (topics.length === 0) return [];
  const scope = topicIndex != null && topics[topicIndex] ? [topics[topicIndex]] : topics;
  const pool = scope.flatMap((t) => t.questions);
  if (pool.length === 0) return [];
  return seededShuffle(pool, seed).slice(0, Math.min(count, pool.length));
}
