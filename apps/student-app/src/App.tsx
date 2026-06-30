import { useEffect, useState } from 'react';
import { getQuiz, submitAnswer, type Quiz } from './api';

type Stage = 'join' | 'play' | 'done';

export default function App() {
  const [stage, setStage] = useState<Stage>('join');
  const [sessionId, setSessionId] = useState('');
  const [quizId, setQuizId] = useState('');
  const [studentId] = useState(() => `s-${Math.random().toString(36).slice(2, 8)}`);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stage !== 'play' || !quizId) return;
    getQuiz(quizId)
      .then(setQuiz)
      .catch((e) => setError(e.message));
  }, [stage, quizId]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !quizId) return;
    setStage('play');
  }

  async function handleAnswer(choice: number) {
    if (!quiz) return;
    const q = quiz.questions[idx];
    const start = performance.now();
    try {
      await submitAnswer({
        sessionId,
        quizId: quiz.id,
        questionId: q.id,
        studentId,
        choice,
        latencyMs: Math.round(performance.now() - start),
      });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    if (idx + 1 < quiz.questions.length) setIdx(idx + 1);
    else setStage('done');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">EduStream — Student</h1>
          <span className="text-xs text-slate-500">id: {studentId}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {stage === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4 rounded-lg bg-white p-6 shadow-sm border">
            <h2 className="text-lg font-medium">Rejoindre une session</h2>
            <label className="block">
              <span className="text-sm font-medium">Session ID</span>
              <input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="ex: session-123"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Quiz ID</span>
              <input
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                placeholder="uuid du quiz"
                required
              />
            </label>
            <button
              type="submit"
              className="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            >
              Entrer
            </button>
          </form>
        )}

        {stage === 'play' && quiz && (
          <div className="rounded-lg bg-white p-6 shadow-sm border">
            <p className="text-sm text-slate-500">
              Question {idx + 1} / {quiz.questions.length}
            </p>
            <h2 className="mt-2 text-xl font-medium">{quiz.questions[idx].text}</h2>
            <div className="mt-6 grid gap-3">
              {quiz.questions[idx].choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="rounded border bg-slate-50 px-4 py-3 text-left hover:bg-indigo-50 hover:border-indigo-300"
                >
                  <span className="font-mono text-slate-400 mr-2">{String.fromCharCode(65 + i)}.</span>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 'play' && !quiz && !error && <p className="text-slate-500">Chargement du quiz…</p>}

        {stage === 'done' && (
          <div className="rounded-lg bg-white p-6 shadow-sm border text-center">
            <h2 className="text-xl font-medium">Quiz terminé</h2>
            <p className="mt-2 text-slate-500">Tes réponses ont été envoyées.</p>
          </div>
        )}
      </main>
    </div>
  );
}
