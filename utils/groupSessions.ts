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
