import { QuizQuestion } from '@/types/quiz';
import { SignAssets, SignPairs } from '@/constants/signs';

/**
 * Hydrates raw JSON quiz questions with actual bundled sign images from the signs/ database.
 */
export function hydrateQuestion(question: QuizQuestion): QuizQuestion {
  const q = { ...question };

  // 1. Check if pairId exists and has mapped signs
  if (q.pairId && SignPairs[q.pairId]) {
    const pair = SignPairs[q.pairId];

    // Format: Two Image Choice (imageChoice / twoImageChoice)
    if (
      q.format === 'twoImageChoice' ||
      q.format === 'imageChoice' ||
      (Array.isArray(q.images) && q.images.length >= 2)
    ) {
      q.images = [
        q.images?.[0] || pair.A,
        q.images?.[1] || pair.B,
      ];
      return q;
    }

    // Format: Single Image with Sign Ref (e.g. signRef: 'A' or 'B')
    if (q.signRef && pair[q.signRef as 'A' | 'B']) {
      q.image = q.image || pair[q.signRef as 'A' | 'B'];
      return q;
    }

    // Fallback: If single image choice without explicit signRef, assign pair.A or pair.B
    if (q.format === 'singleImageChoice' || q.format === 'imageTextChoice') {
      q.image = q.image || (q.correctAnswer === 1 ? pair.B : pair.A);
      return q;
    }
  }

  // 2. Keyword fallback matching from question text or answer names
  if (!q.image && (q.format === 'singleImageChoice' || q.format === 'imageTextChoice')) {
    const lowerQ = (q.question + ' ' + (q.answers?.join(' ') || '')).toLowerCase();
    for (const [key, asset] of Object.entries(SignAssets)) {
      const cleanKey = key.replace(/_/g, ' ');
      if (lowerQ.includes(cleanKey)) {
        q.image = asset;
        break;
      }
    }
  }

  return q;
}

export function hydrateQuestionsList(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map(hydrateQuestion);
}
