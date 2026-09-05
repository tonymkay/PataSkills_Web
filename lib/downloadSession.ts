import { loadRemoteCurriculum, deriveTrack, Track } from './curriculum';
import { loadSignAssets, loadSignPairs } from './signs';
import { hydrateQuestionsList, hydrateSignCatalog } from '@/utils/hydrateQuestions';
import { PlaySession } from '@/utils/groupSessions';
import { SignCatalogEntry } from '@/types/quiz';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

export type DownloadStage = 'curriculum' | 'signs' | 'pairs' | 'hydrating';

export interface DownloadProgress {
  stage: DownloadStage;
  /** 0..1 across the whole download, for a single progress bar. */
  fraction: number;
}

export type DownloadResult =
  | { sessions: PlaySession[]; signCatalog: SignCatalogEntry[] }
  | { error: string };

const STAGE_WEIGHT: Record<DownloadStage, number> = {
  curriculum: 0.35,
  signs: 0.35,
  pairs: 0.2,
  hydrating: 0.1,
};

function fractionUpTo(stage: DownloadStage): number {
  const order: DownloadStage[] = ['curriculum', 'signs', 'pairs', 'hydrating'];
  let sum = 0;
  for (const s of order) {
    if (s === stage) break;
    sum += STAGE_WEIGHT[s];
  }
  return sum;
}

/**
 * Runs the full explicit download flow triggered by "Start Session", for
 * one skill (`skillId`) and one learning-style track. Always fetches the
 * skill's curriculum JSON first; only fetches sign image URLs + sign
 * pairs when that curriculum actually carries a signs catalog (driving-
 * theory does, world-facts doesn't — see json-conversion.md). Skills with
 * no signs catalog hydrate against empty asset/pair maps, which is a
 * no-op for plain-text questions that carry no image/pairId refs, so no
 * separate code path is needed downstream. DB-only — no local fallback of
 * any kind. Resolves with either the hydrated questions or a
 * human-readable error, never throws.
 */
export async function downloadSession(
  track: Track = 'full',
  skillId: CurriculumSlug = 'driving-theory',
  onProgress?: (progress: DownloadProgress) => void,
): Promise<DownloadResult> {
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
    const sessions = deriveTrack(hydrated, signCatalog, track);

    onProgress?.({ stage: 'hydrating', fraction: 1 });
    return { sessions, signCatalog };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong downloading the session.';
    return { error: message };
  }
}
