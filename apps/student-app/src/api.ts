export type Question = { id: string; text: string; choices: string[] };
export type Quiz = { id: string; courseId: string; title: string; questions: Question[] };

export async function getQuiz(quizId: string): Promise<Quiz> {
  const res = await fetch(`/api/courses/quizzes/${quizId}`);
  if (!res.ok) throw new Error(`quiz ${quizId} not found`);
  return res.json();
}

export async function submitAnswer(payload: {
  sessionId: string;
  quizId: string;
  questionId: string;
  studentId: string;
  choice: number | string;
  latencyMs?: number;
}): Promise<void> {
  const res = await fetch('/api/answers/answers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('failed to submit answer');
}
