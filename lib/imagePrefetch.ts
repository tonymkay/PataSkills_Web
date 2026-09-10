import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { PlaySession } from '@/utils/groupSessions';
import { QuizQuestion, SignCatalogEntry } from '@/types/quiz';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

/**
 * Local-first image prefetching, scoped per skill (never crosses into
 * another skillId's assets). Backs the offline-image strategy: batch 0
 * (current + next 4 sessions) is awaited before the downloading-dots
 * screen releases the user into questions; everything after that is
 * fetched in the background while the user plays, resumable across app
 * restarts/aborts via the persisted "done" set below.
 */

const DONE_KEY_PREFIX = '@play/image_prefetch_done:';
const SESSIONS_PER_BATCH = 5; // current session + next 4

function doneKey(skillId: CurriculumSlug): string {
  return `${DONE_KEY_PREFIX}${skillId}`;
}

/** Pulls every real (string, http[s]) image URL out of a question or
 *  sign-catalog entry — silently skips null/undefined/local-asset
 *  (require()'d number) sources, which prefetch() can't handle anyway. */
function extractUrls(source?: unknown): string[] {
  if (typeof source === 'string' && /^https?:\/\//.test(source)) return [source];
  if (Array.isArray(source)) return source.flatMap((s) => extractUrls(s));
  return [];
}

/** All image URLs referenced by one PlaySession (quiz question images or
 *  reading-mode sign images), deduped. */
function urlsForSession(session: PlaySession): string[] {
  if (session.kind === 'reading') {
    return dedupe(session.signs.flatMap((s) => extractUrls(s.image)));
  }
  return dedupe(
    session.questions.flatMap((q) => [...extractUrls(q.image), ...extractUrls(q.images)]),
  );
}

function dedupe(urls: string[]): string[] {
  return Array.from(new Set(urls));
}

/** Every image URL across a whole skill's sessions + sign catalog
 *  (signCatalog covers Reading Mode / Learn More, which can be opened
 *  out of session order at any point). */
function urlsForSkill(sessions: PlaySession[], signCatalog: SignCatalogEntry[]): string[] {
  const fromSessions = sessions.flatMap(urlsForSession);
  const fromCatalog = signCatalog.flatMap((s) => extractUrls(s.image));
  return dedupe([...fromSessions, ...fromCatalog]);
}

async function getDoneSet(skillId: CurriculumSlug): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(doneKey(skillId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function addDone(skillId: CurriculumSlug, urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  try {
    const existing = await getDoneSet(skillId);
    urls.forEach((u) => existing.add(u));
    await AsyncStorage.setItem(doneKey(skillId), JSON.stringify(Array.from(existing)));
  } catch {
    // Non-fatal: worst case a future call re-prefetches an already-cached
    // URL, which expo-image's own disk cache will short-circuit anyway.
  }
}

/** Prefetches a list of URLs (skipping any already marked done for this
 *  skill), disk-caching each via expo-image. Never throws — a failed
 *  image is simply left off the "done" set so the next call (background
 *  continuation, next app open, next navigation top-up) retries it
 *  automatically. Returns the URLs that succeeded this call. */
async function prefetchUrls(urls: string[], skillId: CurriculumSlug): Promise<string[]> {
  if (urls.length === 0) return [];
  const done = await getDoneSet(skillId);
  const pending = urls.filter((u) => !done.has(u));
  if (pending.length === 0) return [];

  const results = await Promise.allSettled(pending.map((u) => Image.prefetch(u)));
  const succeeded = pending.filter((_, i) => results[i].status === 'fulfilled');
  await addDone(skillId, succeeded);
  return succeeded;
}

// Prevents the navigation top-up (step 3) and the background continuation
// (kicked off right after batch 0) from racing each other on the same
// skill and double-prefetching in parallel.
const backgroundRunning = new Set<CurriculumSlug>();

/**
 * Step 2 hook: prefetches the current session + next 4 (SESSIONS_PER_BATCH)
 * sessions' images and awaits it — this is the call that extends the
 * downloading-dots screen so the user never lands on a question whose
 * image is still in flight. Scoped to question images only (not the full
 * sign catalog) to keep this batch small and fast.
 */
export async function prefetchPriorityBatch(
  sessions: PlaySession[],
  skillId: CurriculumSlug,
  fromIndex = 0,
): Promise<void> {
  const batch = sessions.slice(fromIndex, fromIndex + SESSIONS_PER_BATCH);
  const urls = dedupe(batch.flatMap(urlsForSession));
  await prefetchUrls(urls, skillId);
}

/**
 * Challenge-run counterpart to prefetchPriorityBatch() — a challenge race
 * is a flat QuizQuestion[] (built by buildChallengeQuestions()), never
 * chunked into PlaySession[], so it needs its own entry point rather than
 * going through urlsForSession(). Always blocking, never a background
 * continuation: a race's question set is small (one seed-shuffled sample,
 * not a whole skill), so there's no "rest of it" left to sweep afterward.
 * Reuses the same per-skill done-set as every other prefetch call, so a
 * challenge on one curriculum never re-downloads images a normal run (or
 * an earlier challenge) on that same curriculum already cached.
 */
export async function prefetchChallengeQuestions(
  questions: QuizQuestion[],
  skillId: CurriculumSlug,
): Promise<void> {
  const urls = dedupe(questions.flatMap((q) => [...extractUrls(q.image), ...extractUrls(q.images)]));
  await prefetchUrls(urls, skillId);
}

/**
 * Step 2 + 4 hook: fire-and-forget background sweep of everything in this
 * skill NOT already covered by the priority batch — the rest of the
 * sessions plus the full sign catalog (Reading Mode / Learn More, which
 * can be opened out of order). Sequential, small batches so it never
 * competes hard with foreground network use while the user is answering
 * questions. Idempotent and resumable: safe to call again (e.g. next app
 * open, or the navigation top-up in step 3) — already-done URLs are
 * skipped via the persisted done-set, and a failed URL is simply retried
 * on the next call rather than aborting the sweep.
 */
export function backgroundPrefetchSkill(
  sessions: PlaySession[],
  signCatalog: SignCatalogEntry[],
  skillId: CurriculumSlug,
): void {
  if (backgroundRunning.has(skillId)) return;
  backgroundRunning.add(skillId);

  void (async () => {
    try {
      const remainingSessions = sessions.slice(SESSIONS_PER_BATCH);
      for (const session of remainingSessions) {
        await prefetchUrls(urlsForSession(session), skillId);
      }
      const catalogUrls = dedupe(signCatalog.flatMap((s) => extractUrls(s.image)));
      await prefetchUrls(catalogUrls, skillId);
    } catch {
      // Fail gracefully: this whole sweep is best-effort. Whatever didn't
      // make it into the done-set just gets retried next time this (or
      // the priority batch, or the nav top-up) runs.
    } finally {
      backgroundRunning.delete(skillId);
    }
  })();
}

/**
 * Step 3 hook: called whenever the active session index changes. Cheap
 * no-op if the background sweep already covered sessions[i..i+4] — only
 * does real work when the user is navigating faster than the background
 * sweep keeps up.
 */
export function topUpPrefetchFromSession(
  sessions: PlaySession[],
  skillId: CurriculumSlug,
  sessionIndex: number,
): void {
  void prefetchPriorityBatch(sessions, skillId, sessionIndex);
}

/** Whole-skill "is everything local yet" check — used by the downloading
 *  screen (step 2) to skip straight past a redundant prefetch when a
 *  previous background sweep already finished this skill. */
export async function isSkillFullyPrefetched(
  sessions: PlaySession[],
  signCatalog: SignCatalogEntry[],
  skillId: CurriculumSlug,
): Promise<boolean> {
  const all = urlsForSkill(sessions, signCatalog);
  if (all.length === 0) return true;
  const done = await getDoneSet(skillId);
  return all.every((u) => done.has(u));
}
