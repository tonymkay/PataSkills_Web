import { supabase } from './supabase';
import { QuizQuestion, SignCatalogEntry } from '@/types/quiz';
import { groupQuestionsBySession, chunkIntoSessions, chunkSignsIntoSessions, chunkByTopicBounded, PlaySession, QuizPlaySession } from '@/utils/groupSessions';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

const DEFAULT_SLUG: CurriculumSlug = 'driving-theory';

export type Track = 'pairs' | 'names' | 'meanings' | 'whereUsed' | 'full' | 'reading';

type FilterTrack = Exclude<Track, 'full' | 'reading'>;

const TRACK_ROLE: Record<FilterTrack, string> = {
  pairs: 'pair',
  names: 'name',
  meanings: 'meaning',
  whereUsed: 'whereUsed',
};

const TRACK_LABEL: Record<FilterTrack, string> = {
  pairs: 'Pairs',
  names: 'Names',
  meanings: 'Meanings',
  whereUsed: 'Where Used',
};

/**
 * Shared 'full'-track dispatch, used by both deriveTrack() and
 * getTrackTotals() so the sessions a learner actually plays through and
 * the session count shown on the progress bar can never disagree.
 *
 * pairId-grouped skills (driving-theory) take priority since that's an
 * intentional multi-question bundle; topicId-grouped skills (world-facts
 * and similar, §A.4/§C of the multi-skill architecture doc) come next;
 * skills with neither signal fall back to plain 7-question chunking.
 */
function deriveFullSessions(questions: QuizQuestion[]): QuizPlaySession[] {
  if (questions.some((q) => q.pairId)) {
    return groupQuestionsBySession(questions);
  }
  if (questions.some((q) => q.topicId)) {
    return chunkByTopicBounded(questions, 'Full');
  }
  return chunkIntoSessions(questions, 'Full');
}

/**
 * Filters the flat question list by role, then builds sessions for the
 * given track. 'full' dispatches via deriveFullSessions(); 'reading'
 * builds sessions directly from the signs catalog instead of from
 * questions at all.
 */
export function deriveTrack(
  questions: QuizQuestion[],
  signs: SignCatalogEntry[],
  track: Track = 'pairs',
): PlaySession[] {
  if (track === 'full') {
    return deriveFullSessions(questions);
  }

  if (track === 'reading') {
    return chunkSignsIntoSessions(signs, 'Reading');
  }

  const role = TRACK_ROLE[track];
  const filtered = questions.filter((q) => q.role === role);
  return chunkIntoSessions(filtered, TRACK_LABEL[track]);
}

export interface TrackTotals {
  /** Real question count for this track (signs count for 'reading') —
   *  the actual number the progress bar should show one segment per,
   *  not the generic 7-notch placeholder it used before. */
  totalQuestions: number;
  totalSessions: number;
}

// Module-level cache, keyed by skill slug: the browse screens
// (LearningStyleScreen, ModeSwitcherSheet) both need this per whichever
// skill the learner is currently in, and it only takes one curriculum
// fetch (no sign assets/pairs — those don't affect the counts) to compute
// every track's totals for that skill at once. Shared across callers
// within the app session; a skill's entry is cleared on failure so a
// later call for that same skill can retry.
const trackTotalsCache = new Map<CurriculumSlug, Promise<Record<Track, TrackTotals>>>();

/**
 * Real per-track totals for the progress bars on the browse screens, for
 * one skill's curriculum — one lightweight curriculum fetch (JSON only,
 * no sign images/pairs), filtered/grouped the same way deriveTrack does,
 * just counted instead of hydrated into full sessions.
 */
export function getTrackTotals(slug: CurriculumSlug = DEFAULT_SLUG): Promise<Record<Track, TrackTotals>> {
  let cached = trackTotalsCache.get(slug);
  if (!cached) {
    cached = loadRemoteCurriculum(slug)
      .then((remote) => {
        const totals = {} as Record<Track, TrackTotals>;
        (Object.keys(TRACK_ROLE) as FilterTrack[]).forEach((t) => {
          const role = TRACK_ROLE[t];
          const count = remote.questions.filter((q) => q.role === role).length;
          totals[t] = { totalQuestions: count, totalSessions: Math.max(1, Math.ceil(count / 7)) };
        });
        totals.full = {
          totalQuestions: remote.questions.length,
          totalSessions: deriveFullSessions(remote.questions).length,
        };
        totals.reading = {
          totalQuestions: remote.signs.length,
          totalSessions: Math.max(1, Math.ceil(remote.signs.length / 7)),
        };
        return totals;
      })
      .catch((e) => {
        trackTotalsCache.delete(slug);
        throw e;
      });
    trackTotalsCache.set(slug, cached);
  }
  return cached;
}

interface CurriculumRow {
  slug: string;
  title: string;
  cover_image_path: string | null;
  json_path: string;
}

export interface RemoteCurriculum {
  title: string;
  coverImageUrl: string | null;
  questions: QuizQuestion[];
  signs: SignCatalogEntry[];
}

/**
 * Fetches the active curriculum row + its JSON file from Supabase Storage.
 * DB-only: no cache, no local fallback. Throws on any failure — the caller
 * is responsible for surfacing that as a failed download step.
 *
 * The JSON file is either the legacy flat `QuizQuestion[]` shape, or the
 * newer `{ questions, signs }` shape carrying the signs catalog alongside
 * the questions — both are accepted.
 */
export async function loadRemoteCurriculum(
  slug: CurriculumSlug = DEFAULT_SLUG,
): Promise<RemoteCurriculum> {
  const { data: row, error } = await supabase
    .from('play_curricula')
    .select('slug, title, cover_image_path, json_path')
    .eq('slug', slug)
    .eq('is_active', true)
    .single<CurriculumRow>();

  if (error) throw error;
  if (!row) throw new Error(`no active play_curricula row for slug "${slug}"`);

  const { data: jsonPub } = supabase.storage.from('play-assets').getPublicUrl(row.json_path);
  if (!jsonPub?.publicUrl) throw new Error('could not resolve json_path public URL');

  const res = await fetch(jsonPub.publicUrl);
  if (!res.ok) throw new Error(`curriculum fetch failed: ${res.status}`);
  const body = (await res.json()) as QuizQuestion[] | { questions: QuizQuestion[]; signs?: SignCatalogEntry[] };

  const questions = Array.isArray(body) ? body : body.questions;
  const signs = Array.isArray(body) ? [] : (body.signs ?? []);
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('curriculum JSON was empty or malformed');
  }

  const coverImageUrl = row.cover_image_path
    ? supabase.storage.from('play-assets').getPublicUrl(row.cover_image_path).data?.publicUrl ?? null
    : null;

  return { title: row.title, coverImageUrl, questions, signs };
}
