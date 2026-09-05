import { QuizQuestion, SignCatalogEntry } from '@/types/quiz';
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

/**
 * Builds Reading Mode content directly from questions for any skill with
 * no real signs catalog (signs: [] — e.g. world-facts, which has no
 * image-backed content). Reading is a fixed, app-understood track kind
 * every skill should be able to offer (see the 2026-09-06 note atop
 * docs/learning-tracks-and-reading-mode.md) — this is the fallback
 * content source `lib/curriculum.ts` reaches for when a skill's real
 * `signs` array is empty, so a JSON author never needs new app code just
 * to add a `{"kind":"reading"}` learning mode to a text-only skill.
 *
 * One derived entry per question: `meaning` is the correct answer text,
 * `explanation` is the question's own `explanation` field if it's been
 * authored, otherwise a plain fact statement built from the question +
 * correct answer (never blank, even for content like world-facts where
 * every source `explanation` is currently `""`).
 */
export function deriveReadingEntriesFromQuestions(questions: QuizQuestion[]): SignCatalogEntry[] {
  return questions.map((q) => {
    const answers = q.answers ?? [];
    const correctAnswer = answers[q.correctAnswer] ?? '';
    const explanation =
      q.explanation && q.explanation.trim().length > 0
        ? q.explanation
        : `${q.question} ${correctAnswer}`.trim();
    return {
      signId: q.id,
      pairId: q.pairId ?? q.id,
      signRef: 'A',
      name: correctAnswer || q.question,
      signType: 'informational',
      meaning: correctAnswer,
      whereUsed: q.section ?? '',
      explanation,
      image: null,
    };
  });
}

/**
 * Hydrates the signs catalog (used by Reading Mode / Learn More) with the
 * same real sign image URLs the quiz questions already get — via pairId +
 * signRef against play_sign_pairs, no separate image field needed.
 */
export function hydrateSignCatalog(
  signs: SignCatalogEntry[],
  pairs: Record<string, SignPair>,
): SignCatalogEntry[] {
  return signs.map((s) => {
    const pair = pairs[s.pairId];
    if (!pair) return s;
    return { ...s, image: s.signRef === 'A' ? pair.urlA : pair.urlB };
  });
}
