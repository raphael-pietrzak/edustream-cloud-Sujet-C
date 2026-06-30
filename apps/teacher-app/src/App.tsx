import { useEffect, useState } from 'react';
import {
  createCourse,
  createQuiz,
  listCourses,
  openSessionStream,
  type Course,
  type Quiz,
  type SessionStat,
} from './api';

type Tab = 'courses' | 'dashboard';

export default function App() {
  const [tab, setTab] = useState<Tab>('courses');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">EduStream — Teacher</h1>
          <nav className="flex gap-2 text-sm">
            <TabBtn active={tab === 'courses'} onClick={() => setTab('courses')}>Cours & Quiz</TabBtn>
            <TabBtn active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>Live Dashboard</TabBtn>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {tab === 'courses' ? <CoursesPanel /> : <DashboardPanel />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function CoursesPanel() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selected, setSelected] = useState<Course | null>(null);

  useEffect(() => {
    listCourses().then(setCourses).catch((e) => setError(e.message));
  }, []);

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    try {
      const c = await createCourse(newTitle, newDesc);
      setCourses((cs) => [...cs, c]);
      setNewTitle('');
      setNewDesc('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-lg bg-white p-6 shadow-sm border">
        <h2 className="text-lg font-medium mb-4">Cours</h2>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <ul className="space-y-2 mb-6">
          {courses.length === 0 && <li className="text-sm text-slate-500">Aucun cours.</li>}
          {courses.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c)}
                className={`w-full text-left rounded border px-3 py-2 hover:border-indigo-300 ${
                  selected?.id === c.id ? 'border-indigo-500 bg-indigo-50' : ''
                }`}
              >
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-slate-500">{c.description || '—'}</div>
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleCreateCourse} className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">Nouveau cours</h3>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titre"
            required
            className="w-full rounded border px-3 py-2"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description"
            className="w-full rounded border px-3 py-2"
          />
          <button className="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
            Créer
          </button>
        </form>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm border">
        <h2 className="text-lg font-medium mb-4">Nouveau quiz</h2>
        {selected ? (
          <QuizForm course={selected} />
        ) : (
          <p className="text-sm text-slate-500">Sélectionne un cours.</p>
        )}
      </section>
    </div>
  );
}

function QuizForm({ course }: { course: Course }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { id: 'q1', text: '', choices: ['', ''] },
  ]);
  const [created, setCreated] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addQuestion() {
    setQuestions((qs) => [...qs, { id: `q${qs.length + 1}`, text: '', choices: ['', ''] }]);
  }
  function updateQ(i: number, patch: Partial<(typeof questions)[number]>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const quiz = await createQuiz(course.id, title, questions);
      setCreated(quiz);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-slate-500">Cours : {course.title}</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre du quiz"
        required
        className="w-full rounded border px-3 py-2"
      />
      {questions.map((q, i) => (
        <div key={i} className="rounded border p-3 space-y-2">
          <input
            value={q.text}
            onChange={(e) => updateQ(i, { text: e.target.value })}
            placeholder={`Question ${i + 1}`}
            required
            className="w-full rounded border px-2 py-1 text-sm"
          />
          {q.choices.map((c, ci) => (
            <input
              key={ci}
              value={c}
              onChange={(e) => {
                const choices = [...q.choices];
                choices[ci] = e.target.value;
                updateQ(i, { choices });
              }}
              placeholder={`Choix ${String.fromCharCode(65 + ci)}`}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          ))}
          <button
            type="button"
            onClick={() => updateQ(i, { choices: [...q.choices, ''] })}
            className="text-xs text-indigo-600 hover:underline"
          >
            + choix
          </button>
        </div>
      ))}
      <button type="button" onClick={addQuestion} className="text-sm text-indigo-600 hover:underline">
        + question
      </button>
      <button className="w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
        Créer le quiz
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {created && (
        <p className="text-sm text-emerald-700">
          Quiz créé. ID : <code className="font-mono">{created.id}</code>
        </p>
      )}
    </form>
  );
}

function DashboardPanel() {
  const [sessionId, setSessionId] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [stats, setStats] = useState<SessionStat[]>([]);

  useEffect(() => {
    if (!streaming || !sessionId) return;
    const close = openSessionStream(sessionId, setStats);
    return close;
  }, [streaming, sessionId]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow-sm border">
        <h2 className="text-lg font-medium mb-3">Session live</h2>
        <div className="flex gap-2">
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Session ID"
            className="flex-1 rounded border px-3 py-2"
          />
          <button
            onClick={() => setStreaming((s) => !s)}
            className={`rounded px-4 py-2 font-medium text-white ${
              streaming ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {streaming ? 'Stop' : 'Stream'}
          </button>
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm border">
        <h2 className="text-lg font-medium mb-3">Statistiques (fenêtre 10 s)</h2>
        {stats.length === 0 && <p className="text-sm text-slate-500">En attente de données…</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((s, i) => (
            <div key={s._id ?? i} className="rounded border p-3">
              <p className="text-xs text-slate-500">question {s.questionId}</p>
              <p className="text-xs text-slate-400">{s.windowStart}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(s.counts ?? {}).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="font-mono">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
