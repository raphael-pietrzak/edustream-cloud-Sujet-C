export type Course = { id: string; title: string; description: string; createdAt: string };
export type Question = { id: string; text: string; choices: string[] };
export type Quiz = { id: string; courseId: string; title: string; questions: Question[] };
export type SessionStat = {
  _id?: string;
  sessionId: string;
  questionId: string;
  windowStart?: string;
  counts?: Record<string, number>;
};

export async function listCourses(): Promise<Course[]> {
  const res = await fetch('/api/courses/courses');
  if (!res.ok) throw new Error('failed to list courses');
  return res.json();
}

export async function createCourse(title: string, description: string): Promise<Course> {
  const res = await fetch('/api/courses/courses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) throw new Error('failed to create course');
  return res.json();
}

export async function createQuiz(courseId: string, title: string, questions: Question[]): Promise<Quiz> {
  const res = await fetch(`/api/courses/courses/${courseId}/quizzes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, questions }),
  });
  if (!res.ok) throw new Error('failed to create quiz');
  return res.json();
}

export function openSessionStream(sessionId: string, onData: (stats: SessionStat[]) => void): () => void {
  const es = new EventSource(`/api/teacher/sessions/${sessionId}/stream`);
  es.onmessage = (e) => {
    try {
      onData(JSON.parse(e.data));
    } catch {
      /* ignore */
    }
  };
  return () => es.close();
}
