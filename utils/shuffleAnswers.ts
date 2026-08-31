import { QuizQuestion } from '@/types/quiz';

function shuffledIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Returns a copy of `question` with its answer options (or A/B images) in a
 * random order, and `correctAnswer` remapped to wherever the right option
 * landed. Call this whenever a question is placed into the deck — on
 * initial load and again on every requeue after a wrong answer — so the
 * position of the correct answer is never memorizable, on a retake or
 * mid-session retry alike.
 */
export function shuffleAnswers<T extends QuizQuestion>(question: T): T {
  // Two-image layout: shuffle the images (and any custom labels attached
  // to them) together, so a label stays paired with its own image while
  // the position it lands in (A slot vs B slot) is randomized.
  if (Array.isArray(question.images) && question.images.length >= 2) {
    const order = shuffledIndices(question.images.length);
    const newImages = order.map((i) => question.images![i]);
    const newLabels = question.labels
      ? order.map((i) => question.labels![i])
      : question.labels;
    return {
      ...question,
      images: newImages,
      labels: newLabels,
      correctAnswer: order.indexOf(question.correctAnswer),
    };
  }

  // Text / single-image layout: shuffle the answer strings.
  if (Array.isArray(question.answers) && question.answers.length >= 2) {
    const order = shuffledIndices(question.answers.length);
    const newAnswers = order.map((i) => question.answers![i]);
    return {
      ...question,
      answers: newAnswers,
      correctAnswer: order.indexOf(question.correctAnswer),
    };
  }

  return question;
}
