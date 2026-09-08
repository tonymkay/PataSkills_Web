import { supabase, getPlayAssetPublicUrl } from './supabase';
import { QuizQuestion, SignCatalogEntry, CurriculumTrackDefinition } from '@/types/quiz';
import { groupQuestionsBySession, chunkIntoSessions, chunkSignsIntoSessions, chunkByTopicBounded, PlaySession, QuizPlaySession } from '@/utils/groupSessions';
import { deriveReadingEntriesFromQuestions } from '@/utils/hydrateQuestions';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

/**
 * Reading is a fixed track kind every skill can offer — real signs
 * catalog if the skill has one (driving-theory), otherwise derived
 * straight from its questions (true-false and any future skill with no
 * image-backed content). Never empty as long as there are questions, so
 * a `{"kind":"reading"}` learning mode in a curriculum's JSON always has
 * something to show without needing an app change.
 */
function resolveReadingEntries(
  questions: QuizQuestion[],
  signs: SignCatalogEntry[],
  readingDef?: CurriculumTrackDefinition,
): SignCatalogEntry[] {
  if (signs.length > 0) return signs;
  // A reading-kind track can scope itself to a subset of questions via
  // its own filterRole/filterTags (e.g. "Reading — Give Way Signs Only")
  // — purely a JSON declaration, no app change needed to add a scoped
  // reading mode. Only applies to the derived-from-questions path; a
  // skill with a real signs catalog ignores this (its catalog is
  // hand-authored as a whole, not filterable by question role).
  let scoped = questions;
  if (readingDef?.filterRole) {
    scoped = scoped.filter((q) => roleMatches(q.role, readingDef.filterRole!));
  }
  if (readingDef?.filterTags) {
    scoped = scoped.filter((q) => tagsMatch(q.tags, readingDef.filterTags!));
  }
  return deriveReadingEntriesFromQuestions(scoped);
}

const DEFAULT_SLUG: CurriculumSlug = 'driving-theory';

export type StandardTrack = 'pairs' | 'names' | 'meanings' | 'whereUsed' | 'full' | 'reading';
export type Track = StandardTrack | (string & {});

type FilterTrack = Exclude<StandardTrack, 'full' | 'reading'>;

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

// Canonical display order for a skill's detected tracks — matches the
// order these were shown in before the four role tracks were gated out
// of the UI. 'full' last, since every skill has it and it reads as the
// "everything" option.
const TRACK_ORDER: Track[] = ['pairs', 'names', 'meanings', 'whereUsed', 'reading', 'full'];

/**
 * Matches a question's role against a track's filterRole, which may be a
 * single role string or an array of them (one track absorbing several
 * role values, e.g. "Identify Signs" covering name+meaning+whereUsed).
 */
function roleMatches(questionRole: string | undefined, filterRole: string | string[]): boolean {
  if (questionRole === undefined) return false;
  return Array.isArray(filterRole) ? filterRole.includes(questionRole) : questionRole === filterRole;
}

/**
 * AND-matches a track's filterTags against a question's tags — every
 * listed tag must be present on the question, not just one. This is the
 * generic filter primitive (see CurriculumTrackDefinition.filterTags):
 * unlike roleMatches (one dimension, one of several allowed values),
 * this lets a track require several independent tags at once.
 */
function tagsMatch(questionTags: string[] | undefined, filterTags: string | string[]): boolean {
  if (!questionTags || questionTags.length === 0) return false;
  const required = Array.isArray(filterTags) ? filterTags : [filterTags];
  return required.every((t) => questionTags.includes(t));
}

/**
 * Shared 'full'-track dispatch, used by both deriveTrack() and
 * getTrackTotals() so the sessions a learner actually plays through and
 * the session count shown on the progress bar can never disagree.
 *
 * pairId-grouped skills (driving-theory) take priority since that's an
 * intentional multi-question bundle; topicId-grouped skills (true-false
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
 * questions at all. Supports custom track definitions from JSON if provided.
 */
export function deriveTrack(
  questions: QuizQuestion[],
  signs: SignCatalogEntry[],
  track: Track = 'pairs',
  customTrackDefs?: CurriculumTrackDefinition[],
): PlaySession[] {
  const customDef = customTrackDefs?.find((d) => d.id === track);
  if (customDef) {
    if (customDef.kind === 'reading') {
      return chunkSignsIntoSessions(resolveReadingEntries(questions, signs, customDef), customDef.title || 'Reading');
    }
    if (customDef.kind === 'full') {
      return deriveFullSessions(questions);
    }
    let filtered = questions;
    if (customDef.filterRole) {
      filtered = filtered.filter((q) => roleMatches(q.role, customDef.filterRole!));
    }
    if (customDef.filterFormat) {
      const formats = Array.isArray(customDef.filterFormat) ? customDef.filterFormat : [customDef.filterFormat];
      filtered = filtered.filter((q) => formats.includes(q.format));
    }
    if (customDef.filterTags) {
      filtered = filtered.filter((q) => tagsMatch(q.tags, customDef.filterTags!));
    }
    return chunkIntoSessions(filtered, customDef.title || 'Practice');
  }

  if (track === 'full') {
    return deriveFullSessions(questions);
  }

  if (track === 'reading') {
    return chunkSignsIntoSessions(resolveReadingEntries(questions, signs), 'Reading');
  }

  const role = TRACK_ROLE[track as FilterTrack] ?? track;
  const filtered = questions.filter((q) => q.role === role);
  return chunkIntoSessions(filtered, TRACK_LABEL[track as FilterTrack] ?? track);
}

/**
 * Inspects a skill's actual question/sign data and returns which tracks
 * it has real content for. If customTrackDefs is provided in the JSON,
 * uses those definitions directly. Otherwise falls back to data-driven
 * detection of standard tracks.
 */
export function detectAvailableTracks(
  questions: QuizQuestion[],
  signs: SignCatalogEntry[],
  customTrackDefs?: CurriculumTrackDefinition[],
): Track[] {
  if (customTrackDefs && customTrackDefs.length > 0) {
    const available: Track[] = [];
    for (const def of customTrackDefs) {
      if (def.kind === 'reading') {
        // Available if there's a real catalog, or if the (optionally
        // filterRole/filterTags-scoped) question subset is non-empty —
        // see resolveReadingEntries(). A scoped reading track with no
        // matching questions correctly doesn't show up at all.
        const hasContent =
          signs.length > 0 || resolveReadingEntries(questions, signs, def).length > 0;
        if (hasContent) available.push(def.id);
      } else if (def.kind === 'full') {
        if (questions.length > 0) available.push(def.id);
      } else if (def.filterRole || def.filterFormat || def.filterTags) {
        const matches = questions.some((q) => {
          if (def.filterRole && !roleMatches(q.role, def.filterRole)) return false;
          if (def.filterFormat) {
            const formats = Array.isArray(def.filterFormat) ? def.filterFormat : [def.filterFormat];
            if (!formats.includes(q.format)) return false;
          }
          if (def.filterTags && !tagsMatch(q.tags, def.filterTags)) return false;
          return true;
        });
        if (matches) available.push(def.id);
      } else {
        if (questions.length > 0) available.push(def.id);
      }
    }
    // 'full' and 'reading' are compulsory for every skill regardless of
    // what the JSON's tracks array declares — a curriculum author should
    // never be able to accidentally ship a skill missing either. If the
    // JSON omitted one (or both), synthesize its presence here; deriveTrack()
    // and getTrackTotals() already handle 'full'/'reading' by id even with
    // no matching customTrackDefs entry (see their fallback branches), so
    // just ensuring the id shows up in this list is enough to make it
    // selectable end-to-end with no further wiring.
    if (!available.includes('full') && questions.length > 0) available.push('full');
    if (!available.includes('reading') && (signs.length > 0 || questions.length > 0)) available.push('reading');
    return available;
  }

  const available = new Set<Track>(['full']);
  if (signs.length > 0 || questions.length > 0) available.add('reading');
  (Object.keys(TRACK_ROLE) as FilterTrack[]).forEach((t) => {
    if (questions.some((q) => q.role === TRACK_ROLE[t])) available.add(t);
  });
  return TRACK_ORDER.filter((t) => available.has(t));
}

export interface TrackTotals {
  /** Real question count for this track (signs count for 'reading') —
   *  the actual number the progress bar should show one segment per,
   *  not the generic 7-notch placeholder it used before. */
  totalQuestions: number;
  totalSessions: number;
}

// Module-level cache of the lightweight curriculum fetch itself (JSON
// only, no sign images/pairs), keyed by skill slug — shared by
// getTrackTotals() and getAvailableTracks() below so a skill's
// questions/signs are only ever fetched once per app session no matter
// how many browse screens ask for totals vs. track availability. A
// skill's entry is cleared on failure so a later call can retry.
const curriculumCache = new Map<CurriculumSlug, Promise<RemoteCurriculum>>();

function loadCurriculumCached(slug: CurriculumSlug): Promise<RemoteCurriculum> {
  let cached = curriculumCache.get(slug);
  if (!cached) {
    cached = loadRemoteCurriculum(slug).catch((e) => {
      curriculumCache.delete(slug);
      throw e;
    });
    curriculumCache.set(slug, cached);
  }
  return cached;
}

// Second-level cache: the totals computed *from* the shared fetch above,
// so repeat calls for the same skill don't redo the per-track filtering
// either. Browse screens (LearningStyleScreen, ModeSwitcherSheet) both
// need this per whichever skill the learner is currently in.
const trackTotalsCache = new Map<CurriculumSlug, Promise<Record<Track, TrackTotals>>>();

/**
 * Real per-track totals for the progress bars on the browse screens, for
 * one skill's curriculum — one lightweight curriculum fetch (JSON only,
 * no sign images/pairs), filtered/grouped the same way deriveTrack does,
 * just counted instead of hydrated into full sessions. Supports both
 * JSON-defined custom tracks and legacy/standard track keys.
 */
export function getTrackTotals(slug: CurriculumSlug = DEFAULT_SLUG): Promise<Record<Track, TrackTotals>> {
  let cached = trackTotalsCache.get(slug);
  if (!cached) {
    cached = loadCurriculumCached(slug)
      .then((remote) => {
        const totals = {} as Record<Track, TrackTotals>;

        // 1. If curriculum JSON defined custom tracks, compute counts for each
        if (remote.tracks && remote.tracks.length > 0) {
          for (const def of remote.tracks) {
            if (def.kind === 'reading') {
              const readingEntries = resolveReadingEntries(remote.questions, remote.signs, def);
              totals[def.id] = {
                totalQuestions: readingEntries.length,
                totalSessions: Math.max(1, Math.ceil(readingEntries.length / 7)),
              };
            } else if (def.kind === 'full') {
              totals[def.id] = {
                totalQuestions: remote.questions.length,
                totalSessions: deriveFullSessions(remote.questions).length,
              };
            } else {
              let filtered = remote.questions;
              if (def.filterRole) {
                filtered = filtered.filter((q) => roleMatches(q.role, def.filterRole!));
              }
              if (def.filterFormat) {
                const formats = Array.isArray(def.filterFormat) ? def.filterFormat : [def.filterFormat];
                filtered = filtered.filter((q) => formats.includes(q.format));
              }
              if (def.filterTags) {
                filtered = filtered.filter((q) => tagsMatch(q.tags, def.filterTags!));
              }
              totals[def.id] = {
                totalQuestions: filtered.length,
                totalSessions: Math.max(1, Math.ceil(filtered.length / 7)),
              };
            }
          }
        }

        // 2. Also populate standard track keys for backwards-compatibility
        (Object.keys(TRACK_ROLE) as FilterTrack[]).forEach((t) => {
          if (!totals[t]) {
            const role = TRACK_ROLE[t];
            const count = remote.questions.filter((q) => q.role === role).length;
            totals[t] = { totalQuestions: count, totalSessions: Math.max(1, Math.ceil(count / 7)) };
          }
        });
        if (!totals.full) {
          totals.full = {
            totalQuestions: remote.questions.length,
            totalSessions: deriveFullSessions(remote.questions).length,
          };
        }
        if (!totals.reading) {
          const readingEntries = resolveReadingEntries(remote.questions, remote.signs);
          totals.reading = {
            totalQuestions: readingEntries.length,
            totalSessions: Math.max(1, Math.ceil(readingEntries.length / 7)),
          };
        }

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

/**
 * Async, per-skill version of detectAvailableTracks() for screens that
 * only know the skill slug (LearningStyleScreen et al.) — shares
 * loadCurriculumCached()'s fetch with getTrackTotals(), so calling both
 * for the same skill costs one network round-trip, not two.
 */
export function getAvailableTracks(slug: CurriculumSlug = DEFAULT_SLUG): Promise<Track[]> {
  return loadCurriculumCached(slug).then((remote) =>
    detectAvailableTracks(remote.questions, remote.signs, remote.tracks),
  );
}

/**
 * Returns any custom track definitions declared in the curriculum JSON,
 * or undefined if the curriculum only uses legacy auto-detection.
 */
export function getCurriculumTrackDefs(
  slug: CurriculumSlug = DEFAULT_SLUG,
): Promise<CurriculumTrackDefinition[] | undefined> {
  return loadCurriculumCached(slug).then((remote) => remote.tracks);
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
  tracks?: CurriculumTrackDefinition[];
  questions: QuizQuestion[];
  signs: SignCatalogEntry[];
}

/**
 * Two-image ("which sign means X") questions carry a `pairId` (e.g. "A1")
 * but the curriculum JSON often ships with `images: [null, null]` — the
 * real linking lives in play_sign_pairs (pairId -> key_a/key_b) + play_signs
 * (key -> image_path), maintained via the admin Signs screen, but nothing
 * ever merges it back into the static JSON. Resolve it here at load time
 * instead, so relinking a sign in admin takes effect immediately with no
 * separate publish/export step, and it self-heals for every curriculum
 * that uses this pairId pattern, not just today's.
 */
async function resolvePairedSignImages(questions: QuizQuestion[]): Promise<QuizQuestion[]> {
  const needsResolve = questions.some(
    (q) => q.pairId && Array.isArray(q.images) && q.images.some((img) => !img),
  );
  if (!needsResolve) return questions;

  const [{ data: pairs }, { data: signs }] = await Promise.all([
    supabase.from('play_sign_pairs').select('pair_id, key_a, key_b'),
    supabase.from('play_signs').select('key, image_path'),
  ]);
  if (!pairs || !signs) return questions;

  const imagePathByKey = new Map<string, string>(signs.map((s: any) => [s.key, s.image_path]));
  const pairByPairId = new Map<string, { key_a: string; key_b: string }>(
    pairs.map((p: any) => [p.pair_id, p]),
  );

  return questions.map((q) => {
    if (!q.pairId || !Array.isArray(q.images)) return q;
    const pair = pairByPairId.get(q.pairId);
    if (!pair) return q;
    const pathA = imagePathByKey.get(pair.key_a);
    const pathB = imagePathByKey.get(pair.key_b);
    if (!pathA && !pathB) return q;
    return {
      ...q,
      images: [
        q.images[0] ?? (pathA ? getPlayAssetPublicUrl(pathA) : q.images[0]),
        q.images[1] ?? (pathB ? getPlayAssetPublicUrl(pathB) : q.images[1]),
      ],
    };
  });
}

/**
 * Fetches the active curriculum row + its JSON file from Supabase Storage.
 * DB-only: no cache, no local fallback. Throws on any failure — the caller
 * is responsible for surfacing that as a failed download step.
 *
 * The JSON file is either the legacy flat `QuizQuestion[]` shape, or the
 * newer `{ tracks?, questions, signs? }` shape.
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
  const body = (await res.json()) as
    | QuizQuestion[]
    | { tracks?: CurriculumTrackDefinition[]; questions: QuizQuestion[]; signs?: SignCatalogEntry[] };

  const questions = Array.isArray(body) ? body : body.questions;
  const signs = Array.isArray(body) ? [] : (body.signs ?? []);
  const tracks = Array.isArray(body) ? undefined : body.tracks;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('curriculum JSON was empty or malformed');
  }

  const coverImageUrl = row.cover_image_path
    ? supabase.storage.from('play-assets').getPublicUrl(row.cover_image_path).data?.publicUrl ?? null
    : null;

  const resolvedQuestions = await resolvePairedSignImages(questions);

  return { title: row.title, coverImageUrl, tracks, questions: resolvedQuestions, signs };
}
