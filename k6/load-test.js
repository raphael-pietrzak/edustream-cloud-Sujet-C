// k6 load test - simulates 500 students answering a quiz.
// Run: k6 run k6/load-test.js
//      INGEST_URL=http://ingest.edustream.local k6 run k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    answers_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 100 },
        { duration: '40s', target: 500 },
        { duration: '40s', target: 500 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_failed':   ['rate<0.01'],
    'http_req_duration': ['p(95)<300'],
  },
};

const INGEST = __ENV.INGEST_URL || 'http://localhost:3002';
const SESSION_ID = __ENV.SESSION_ID || 'demo-session-1';
const QUIZ_ID = __ENV.QUIZ_ID || 'demo-quiz-1';
const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5'];

export default function () {
  const questionId = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const payload = JSON.stringify({
    sessionId: SESSION_ID,
    quizId: QUIZ_ID,
    questionId,
    studentId: `student-${__VU}`,
    choice: 1 + Math.floor(Math.random() * 4),
    latencyMs: 500 + Math.floor(Math.random() * 3000),
  });
  const res = http.post(`${INGEST}/answers`, payload, { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status is 202': (r) => r.status === 202 });
  sleep(0.3 + Math.random() * 0.7);
}
