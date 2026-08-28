import { QuizQuestion } from '@/types/quiz';
import { loadRemoteCurriculum } from './curriculum';
import { loadSignAssets, loadSignPairs } from './signs';
import { hydrateQuestionsList } from '@/utils/hydrateQuestions';

export type DownloadStage = 'curriculum' | 'signs' | 'pairs' | 'hydrating';

export interface DownloadProgress {
  stage: DownloadStage;
  /** 0..1 across the whole download, for a single progress bar. */
  fraction: number;
}

export type DownloadResult =
  | { questions: QuizQuestion[] }
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
 * Runs the full explicit download flow triggered by "Start Session":
 * curriculum JSON + every sign image URL the curriculum references +
 * sign pairs, then hydrates questions against them. DB-only — no local
 * fallback of any kind. Resolves with either the hydrated questions or
 * a human-readable error, never throws.
 */
export async function downloadSession(
  onProgress?: (progress: DownloadProgress) => void,
): Promise<DownloadResult> {
  try {
    onProgress?.({ stage: 'curriculum', fraction: fractionUpTo('curriculum') });
    const curriculumPromise = loadRemoteCurriculum();

    onProgress?.({ stage: 'signs', fraction: fractionUpTo('signs') });
    const assetsPromise = loadSignAssets();

    const [remote, assets] = await Promise.all([curriculumPromise, assetsPromise]);

    onProgress?.({ stage: 'pairs', fraction: fractionUpTo('pairs') });
    const pairs = await loadSignPairs(assets);

    onProgress?.({ stage: 'hydrating', fraction: fractionUpTo('hydrating') });
    const hydrated = hydrateQuestionsList(remote.questions, assets, pairs);

    onProgress?.({ stage: 'hydrating', fraction: 1 });
    return { questions: hydrated };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong downloading the session.';
    return { error: message };
  }
}
