import { QuizQuestion } from '@/types/quiz';
import { SignPair } from '@/lib/signs';

/**
 * Hydrates raw JSON quiz questions with sign image URLs. DB-only: assets
 * and pairs must be supplied by the caller (the remote-resolved maps from
 * lib/signs.ts) — there is no bundled local registry to default to anymore.
 */
export function hydrateQuestion(
  question: QuizQuestion,
  assets: Record<string, string>,
  pairs: Record<string, SignPair>,
): QuizQuestion {
  const q = { ...question };

  // 1. Check if pairId exists and has mapped signs
  if (q.pairId && pairs[q.pairId]) {
    const pair = pairs[q.pairId];

    // Format: Two Image Choice (imageChoice / twoImageChoice)
    if (
      q.format === 'twoImageChoice' ||
      q.format === 'imageChoice' ||
      (Array.isArray(q.images) && q.images.length >= 2)
    ) {
      q.images = [
        q.images?.[0] || pair.urlA,
        q.images?.[1] || pair.urlB,
      ];
      return q;
    }

    // Format: Single Image with Sign Ref (e.g. signRef: 'A' or 'B')
    if (q.signRef === 'A' || q.signRef === 'B') {
      q.image = q.image || (q.signRef === 'A' ? pair.urlA : pair.urlB);
      return q;
    }

    // Fallback: If single image choice without explicit signRef, assign pair.A or pair.B
    if (q.format === 'singleImageChoice' || q.format === 'imageTextChoice') {
      q.image = q.image || (q.correctAnswer === 1 ? pair.urlB : pair.urlA);
      return q;
    }
  }

  // 2. Keyword fallback matching from question text or answer names
  if (!q.image && (q.format === 'singleImageChoice' || q.format === 'imageTextChoice')) {
    const lowerQ = (q.question + ' ' + (q.answers?.join(' ') || '')).toLowerCase();
    for (const [key, url] of Object.entries(assets)) {
      const cleanKey = key.replace(/_/g, ' ');
      if (lowerQ.includes(cleanKey)) {
        q.image = url;
        break;
      }
    }
  }

  return q;
}

export function hydrateQuestionsList(
  questions: QuizQuestion[],
  assets: Record<string, string>,
  pairs: Record<string, SignPair>,
): QuizQuestion[] {
  return questions.map((q) => hydrateQuestion(q, assets, pairs));
}
