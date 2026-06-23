// Pluggable store: in-memory for local dev/tests, PostgreSQL in cluster.
// PG schema bootstrapped on first connect.

import pg from 'pg';

export async function createStore(config) {
  if (config.useInMemory) return memoryStore();
  return pgStore(config.pg);
}

function memoryStore() {
  const courses = new Map();
  const quizzes = new Map();
  return {
    async ping() { return true; },
    async listCourses() { return [...courses.values()]; },
    async insertCourse(c) { courses.set(c.id, c); },
    async getCourse(id) { return courses.get(id) ?? null; },
    async insertQuiz(q) { quizzes.set(q.id, q); },
    async getQuiz(id) { return quizzes.get(id) ?? null; },
  };
}

async function pgStore(cfg) {
  const pool = new pg.Pool(cfg);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id uuid PRIMARY KEY,
      title text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id uuid PRIMARY KEY,
      course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
      title text NOT NULL,
      questions jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  return {
    async ping() {
      try { await pool.query('SELECT 1'); return true; } catch { return false; }
    },
    async listCourses() {
      const { rows } = await pool.query('SELECT id, title, description, created_at AS "createdAt" FROM courses ORDER BY created_at DESC');
      return rows;
    },
    async insertCourse(c) {
      await pool.query('INSERT INTO courses(id, title, description) VALUES ($1, $2, $3)', [c.id, c.title, c.description]);
    },
    async getCourse(id) {
      const { rows } = await pool.query('SELECT id, title, description, created_at AS "createdAt" FROM courses WHERE id=$1', [id]);
      return rows[0] ?? null;
    },
    async insertQuiz(q) {
      await pool.query('INSERT INTO quizzes(id, course_id, title, questions) VALUES ($1, $2, $3, $4)', [q.id, q.courseId, q.title, JSON.stringify(q.questions)]);
    },
    async getQuiz(id) {
      const { rows } = await pool.query('SELECT id, course_id AS "courseId", title, questions, created_at AS "createdAt" FROM quizzes WHERE id=$1', [id]);
      return rows[0] ?? null;
    },
  };
}
