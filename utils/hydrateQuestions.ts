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
 * no real signs catalog (signs: [] — e.g. true-false, which has no
 * image-backed content). Reading is a fixed, app-understood track kind
 * every skill should be able to offer (see the 2026-09-06 note atop
 * docs/learning-tracks-and-reading-mode.md) — this is the fallback
 * content source `lib/curriculum.ts` reaches for when a skill's real
 * `signs` array is empty, so a JSON author never needs new app code just
 * to add a `{"kind":"reading"}` learning mode to a text-only skill.
 */

/**
 * Question formats that carry a real, hydratable image — anything else
 * (textChoice, and any future text-only format) gets no image slot at
 * all in its derived reading entry, rather than a blank one. Kept in
 * sync with the formats hydrateQuestion() actually resolves an image
 * for above.
 */
const IMAGE_BACKED_FORMATS = new Set(['imageChoice', 'twoImageChoice', 'imageTextChoice', 'singleImageChoice']);

/**
 * Question-shape-aware reading derivation, used for any skill with no
 * real signs catalog (signs: [] — true-false and future text-only
 * skills). One derived entry per question, built entirely from what that
 * specific question actually has, not a fixed schema every question is
 * forced into:
 *  - `name`: the question itself — "question on top" (see
 *    docs/learning-tracks-and-reading-mode.md's reading-mode spec).
 *  - `meaning`: a true statement about the topic (the correct-answer
 *    text, or one of the other options for "which is FALSE" questions —
 *    see the false-flip note below).
 *  - `explanation`: the question's own authored `explanation` merged
 *    with the fact, so the reading card can show "answer + Learn More
 *    content" as one combined block below the question, same content
 *    LearnMoreSheet already surfaces for this question.
 *  - `image`: only set when this question's format actually carries a
 *    hydratable image (IMAGE_BACKED_FORMATS) and it resolved to a real
 *    URL/source — a text-only question (true-false) gets no image slot,
 *    rather than a blank one the card would otherwise render space for.
 *  - `relatedSignIds`: only populated when this question shares a real
 *    `pairId` with another question in the same list (a genuine sibling,
 *    not a synthetic per-question id) — "similar items" is structural,
 *    derived from the data, not hand-authored per entry.
 */
export function deriveReadingEntriesFromQuestions(questions: QuizQuestion[]): SignCatalogEntry[] {
  // Real pairId groups only — a question with no pairId falls back to
  // its own id (see the id-fallback below), which by construction can
  // never have a sibling, so it's naturally excluded from this map.
  const byPairId = new Map<string, QuizQuestion[]>();
  for (const q of questions) {
    if (!q.pairId) continue;
    if (!byPairId.has(q.pairId)) byPairId.set(q.pairId, []);
    byPairId.get(q.pairId)!.push(q);
  }

  return questions.map((q) => {
    const answers = q.answers ?? [];
    // "Which statement is FALSE about X?" flips which option is the real
    // fact: `correctAnswer` there is deliberately the absurd/wrong option
    // (that's what makes picking it the right response to a false-seeking
    // question) — e.g. l1q088 ("false about a superhero costume?") has
    // correctAnswer pointing at "It is a type of fruit". Blindly reading
    // `answers[q.correctAnswer]` as "the fact" is only valid for
    // "which is true" questions; for "which is false" ones it teaches the
    // made-up distractor as if it were real. Pull a true statement from
    // one of the other options instead whenever the question asks for the
    // false one.
    const asksForFalseStatement = /\bfalse\b/i.test(q.question);
    const factIndex =
      asksForFalseStatement && answers.length > 1
        ? (q.correctAnswer === 0 ? 1 : 0)
        : q.correctAnswer;
    const fact = answers[factIndex] ?? '';
    const explanation =
      q.explanation && q.explanation.trim().length > 0 && q.explanation.trim() !== fact.trim()
        ? q.explanation
        : '';

    const hasHydratedImage =
      IMAGE_BACKED_FORMATS.has(q.format) &&
      ((typeof q.image === 'string' && q.image.length > 0) ||
        (Array.isArray(q.images) && q.images.some((img) => typeof img === 'string' && img.length > 0)));

    const siblings = q.pairId ? byPairId.get(q.pairId) ?? [] : [];
    const relatedSignIds = siblings.filter((s) => s.id !== q.id).map((s) => s.id);

    return {
      signId: q.id,
      pairId: q.pairId ?? q.id,
      signRef: 'A',
      name: q.question,
      signType: 'informational',
      meaning: fact,
      whereUsed: '',
      explanation,
      relatedSignIds: relatedSignIds.length > 0 ? relatedSignIds : undefined,
      image: hasHydratedImage ? (typeof q.image === 'string' ? q.image : q.images?.find((img) => typeof img === 'string')) : null,
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
