import { QuizQuestion, SignCatalogEntry } from '@/types/quiz';

export interface QuizPlaySession {
  kind: 'quiz';
  pairId: string;
  title: string;
  questions: QuizQuestion[];
}

export interface ReadingPlaySession {
  kind: 'reading';
  pairId: string;
  title: string;
  signs: SignCatalogEntry[];
}

export type PlaySession = QuizPlaySession | ReadingPlaySession;

/** Group flat question list into ordered sessions by pairId. */
export function groupQuestionsBySession(questions: QuizQuestion[]): QuizPlaySession[] {
  const groups = new Map<string, QuizQuestion[]>();
  const order: string[] = [];

  for (const q of questions) {
    const id = q.pairId ?? q.id;
    if (!groups.has(id)) {
      groups.set(id, []);
      order.push(id);
    }
    groups.get(id)!.push(q);
  }

  return order.map((pairId) => {
    const sessionQuestions = groups.get(pairId)!;
    return {
      kind: 'quiz',
      pairId,
      title: sessionQuestions[0]?.section ?? pairId,
      questions: sessionQuestions,
    };
  });
}

/** Slice an already-filtered, ordered question list into groups of 7. */
export function chunkIntoSessions(questions: QuizQuestion[], label: string): QuizPlaySession[] {
  const sessions: QuizPlaySession[] = [];
  for (let i = 0; i < questions.length; i += 7) {
    const chunk = questions.slice(i, i + 7);
    const setNumber = sessions.length + 1;
    sessions.push({
      kind: 'quiz',
      pairId: `${label}-set-${setNumber}`,
      title: `${label} — Set ${setNumber}`,
      questions: chunk,
    });
  }
  return sessions;
}

/**
 * Slice an ordered, topicId-bearing question list into sessions bounded
 * by [min, max], cutting at topic boundaries where possible.
 *
 * Only start a new session at a topic boundary once the current session
 * already has >= min questions; otherwise merge the next topic's
 * questions forward into the current session rather than shipping an
 * undersized one. Force-split once a session reaches max, even mid-topic,
 * so a single oversized topic can't blow past the bound.
 *
 * bounds defaults to { min: 5, max: 9 } -- Murimi's product spec (§C,
 * Step 2 of the multi-skill architecture doc), not a self-evidently
 * correct default, so don't "simplify" this away in a future refactor.
 *
 * This is a safety net, not an expected code path (§D.2): Murimi's
 * source content is authored with >= 5 questions per topic by design, so
 * the merge-forward branch firing is a signal of an authoring problem at
 * the source, not a normal shape -- hence the warning log when it fires.
 *
 * Callers must only invoke this when at least one question has a
 * topicId; dispatch should fall back to chunkIntoSessions() otherwise.
 */
export function chunkByTopicBounded(
  questions: QuizQuestion[],
  label: string,
  bounds: { min: number; max: number } = { min: 5, max: 9 },
): QuizPlaySession[] {
  const sessions: QuizPlaySession[] = [];
  let current: QuizQuestion[] = [];
  let lastTopicId: string | undefined;

  const pushSession = () => {
    if (current.length === 0) return;
    const setNumber = sessions.length + 1;
    sessions.push({
      kind: 'quiz',
      pairId: `${label}-set-${setNumber}`,
      title: `${label} — Set ${setNumber}`,
      questions: current,
    });
    current = [];
  };

  for (const q of questions) {
    const topicChanged = lastTopicId !== undefined && q.topicId !== lastTopicId;

    if (topicChanged && current.length >= bounds.min) {
      pushSession();
    } else if (topicChanged && current.length > 0) {
      console.warn(
        `[chunkByTopicBounded] merging undersized topic forward: session had ${current.length} question(s) (min ${bounds.min}) when topic changed to "${q.topicId}" -- check source content authoring.`
      );
    }

    current.push(q);
    lastTopicId = q.topicId;

    if (current.length >= bounds.max) {
      pushSession();
    }
  }

  pushSession();
  return sessions;
}

/** Slice an ordered signs catalog list into groups of 7, for Reading Mode. */
export function chunkSignsIntoSessions(signs: SignCatalogEntry[], label: string): ReadingPlaySession[] {
  const sessions: ReadingPlaySession[] = [];
  for (let i = 0; i < signs.length; i += 7) {
    const chunk = signs.slice(i, i + 7);
    const setNumber = sessions.length + 1;
    sessions.push({
      kind: 'reading',
      pairId: `${label}-set-${setNumber}`,
      title: `${label} — Set ${setNumber}`,
      signs: chunk,
    });
  }
  return sessions;
}
