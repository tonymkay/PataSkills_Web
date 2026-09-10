import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadRemoteCurriculum, deriveTrack, Track } from './curriculum';
import { loadSignAssets, loadSignPairs } from './signs';
import { hydrateQuestionsList, hydrateSignCatalog } from '@/utils/hydrateQuestions';
import { PlaySession } from '@/utils/groupSessions';
import { SignCatalogEntry } from '@/types/quiz';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
import { prefetchPriorityBatch, backgroundPrefetchSkill } from './imagePrefetch';

export type DownloadStage = 'curriculum' | 'signs' | 'pairs' | 'hydrating' | 'images';

export interface DownloadProgress {
  stage: DownloadStage;
  /** 0..1 across the whole download, for a single progress bar. */
  fraction: number;
}

export type DownloadResult =
  | { sessions: PlaySession[]; signCatalog: SignCatalogEntry[] }
  | { error: string };

interface CachedSessionPayload {
  sessions: PlaySession[];
  signCatalog: SignCatalogEntry[];
}

function sessionCacheKey(skillId: CurriculumSlug, track: Track): string {
  return `@play/session_cache:${skillId}:${track}`;
}

/** Fully hydrated sessions + sign catalog for one (skillId, track) —
 *  the exact payload downloadSession() would otherwise have to refetch
 *  and rehydrate from the network, cached in one write so a session that
 *  was ever opened once continues to open with no connection. */
async function getCachedDownload(skillId: CurriculumSlug, track: Track): Promise<CachedSessionPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(sessionCacheKey(skillId, track));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSessionPayload;
    if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function cacheDownload(skillId: CurriculumSlug, track: Track, payload: CachedSessionPayload): Promise<void> {
  try {
    await AsyncStorage.setItem(sessionCacheKey(skillId, track), JSON.stringify(payload));
  } catch {}
}

const STAGE_WEIGHT: Record<DownloadStage, number> = {
  curriculum: 0.3,
  signs: 0.3,
  pairs: 0.15,
  hydrating: 0.1,
  images: 0.15,
};

function fractionUpTo(stage: DownloadStage): number {
  const order: DownloadStage[] = ['curriculum', 'signs', 'pairs', 'hydrating', 'images'];
  let sum = 0;
  for (const s of order) {
    if (s === stage) break;
    sum += STAGE_WEIGHT[s];
  }
  return sum;
}

/**
 * Runs the full explicit download flow triggered by "Start Session", for
 * one skill (`skillId`) and one learning-style track. Offline-first: a
 * local cache (see getCachedDownload/cacheDownload above) is checked
 * before any network call, and used as-is if present — only a skill/track
 * combo that has NEVER been opened before, with no connection, produces
 * the error state. On a successful network fetch, the fully hydrated
 * result is persisted in one write so every later open of this exact
 * skill/track (including fully offline, after an app restart) resolves
 * from that cache instead of refetching. Fetches the skill's curriculum
 * JSON first; only fetches sign image URLs + sign pairs when that
 * curriculum actually carries a signs catalog (driving-theory does,
 * true-false doesn't — see json-conversion.md). Skills with no signs
 * catalog hydrate against empty asset/pair maps, which is a no-op for
 * plain-text questions that carry no image/pairId refs, so no separate
 * code path is needed downstream. Before resolving, also blocks on
 * prefetching the current + next 4 sessions' images to disk (see
 * lib/imagePrefetch.ts) so the caller never renders a question whose
 * image is still in flight — the rest of the skill's images continue
 * prefetching in the background after this resolves. Resolves with
 * either the hydrated questions or a human-readable error, never throws.
 */
export async function downloadSession(
  track: Track = 'full',
  skillId: CurriculumSlug = 'driving-theory',
  onProgress?: (progress: DownloadProgress) => void,
): Promise<DownloadResult> {
  const cached = await getCachedDownload(skillId, track);
  if (cached) {
    onProgress?.({ stage: 'images', fraction: fractionUpTo('images') });
    // Cached sessions were hydrated (and possibly image-prefetched) on an
    // earlier visit — re-run just the priority batch, which is a cheap
    // no-op via the persisted done-set for anything already local, and
    // only does real work if that earlier run never finished (killed app,
    // aborted, etc). Resume the rest in the background either way.
    await prefetchPriorityBatch(cached.sessions, skillId);
    backgroundPrefetchSkill(cached.sessions, cached.signCatalog, skillId);
    onProgress?.({ stage: 'images', fraction: 1 });
    return cached;
  }

  try {
    onProgress?.({ stage: 'curriculum', fraction: fractionUpTo('curriculum') });
    const remote = await loadRemoteCurriculum(skillId);
    const hasSigns = remote.signs.length > 0;

    onProgress?.({ stage: 'signs', fraction: fractionUpTo('signs') });
    const assets = hasSigns ? await loadSignAssets() : {};

    onProgress?.({ stage: 'pairs', fraction: fractionUpTo('pairs') });
    const pairs = hasSigns ? await loadSignPairs(assets) : {};

    onProgress?.({ stage: 'hydrating', fraction: fractionUpTo('hydrating') });
    const hydrated = hydrateQuestionsList(remote.questions, assets, pairs);
    const signCatalog = hydrateSignCatalog(remote.signs, pairs);
    const sessions = deriveTrack(hydrated, signCatalog, track, remote.tracks);

    // Block on the current + next 4 sessions' images so the dots don't
    // release the user until those are actually on-disk — this is what
    // stops the "page loaded, image still loading" gap. Everything past
    // that (rest of the skill + the reading-mode sign catalog) continues
    // in the background, scoped to this skillId only.
    onProgress?.({ stage: 'images', fraction: fractionUpTo('images') });
    await prefetchPriorityBatch(sessions, skillId);
    backgroundPrefetchSkill(sessions, signCatalog, skillId);
    onProgress?.({ stage: 'images', fraction: 1 });

    const result: CachedSessionPayload = { sessions, signCatalog };
    void cacheDownload(skillId, track, result);
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong downloading the session.';
    return { error: message };
  }
}
