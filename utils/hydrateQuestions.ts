import { QuizQuestion } from '@/types/quiz';
import { SignPair } from '@/lib/signs';

/**
 * Hydrates raw JSON quiz questions with sign image URLs.
 * Strict Single Source of Truth:
 * - Uses exact `pairId` + `signRef` mapped in `play_sign_pairs` and `play_signs`.
 * - No fuzzy text matching, no heuristic guesses.
 */
export function hydrateQuestion(
  question: QuizQuestion,
  assets: Record<string, string>,
  pairs: Record<string, SignPair>,
): QuizQuestion {
  const q = { ...question };

  // 1. Direct explicit sign key in question.image (if given as a sign key)
  if (typeof q.image === 'string' && assets[q.image]) {
    q.image = assets[q.image];
  }

  // 2. Resolve via pairId
  if (q.pairId && pairs[q.pairId]) {
    const pair = pairs[q.pairId];

    // Format: Two Image Choice
    if (
      q.format === 'twoImageChoice' ||
      q.format === 'imageChoice' ||
      (Array.isArray(q.images) && q.images.length >= 2)
    ) {
      q.images = [pair.urlA, pair.urlB];
      return q;
    }

    // Format: Single Image with Sign Ref ('A' or 'B')
    if (q.signRef === 'A') {
      q.image = pair.urlA;
      return q;
    }

    if (q.signRef === 'B') {
      q.image = pair.urlB;
      return q;
    }

    // Single image format without explicit signRef: assign based on correctAnswer
    if (q.format === 'singleImageChoice' || q.format === 'imageTextChoice') {
      q.image = q.correctAnswer === 1 ? pair.urlB : pair.urlA;
      return q;
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
