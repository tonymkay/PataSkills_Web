import { QuizQuestion } from '@/types/quiz';

export interface PlaySession {
  pairId: string;
  title: string;
  questions: QuizQuestion[];
}

/** Group flat question list into ordered sessions by pairId. */
export function groupQuestionsBySession(questions: QuizQuestion[]): PlaySession[] {
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
      pairId,
      title: sessionQuestions[0]?.section ?? pairId,
      questions: sessionQuestions,
    };
  });
}
