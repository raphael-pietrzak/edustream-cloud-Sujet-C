// Sliding window in-memory aggregator.
// Window flush: every windowSeconds, snapshot current bucket and upsert to Mongo.
//
// Bucket key = `${sessionId}:${questionId}`
// Maintains: total, correct, choices histogram, sum_latency, count_latency.

export function createAggregator({ correctChoiceLookup = async () => null } = {}) {
  const buckets = new Map();

  function getBucket(key) {
    let b = buckets.get(key);
    if (!b) {
      b = { total: 0, correct: 0, choices: {}, sumLatency: 0, latencyCount: 0 };
      buckets.set(key, b);
    }
    return b;
  }

  async function ingest(event) {
    if (!event || !event.sessionId || !event.questionId || event.choice === undefined) {
      throw new Error('invalid event');
    }
    const key = `${event.sessionId}:${event.questionId}`;
    const bucket = getBucket(key);
    bucket.total += 1;
    bucket.choices[event.choice] = (bucket.choices[event.choice] ?? 0) + 1;
    if (typeof event.latencyMs === 'number') {
      bucket.sumLatency += event.latencyMs;
      bucket.latencyCount += 1;
    }
    const correct = await correctChoiceLookup(event.quizId, event.questionId);
    if (correct !== null && correct === event.choice) bucket.correct += 1;
  }

  function snapshot() {
    const docs = [];
    for (const [key, b] of buckets.entries()) {
      const [sessionId, questionId] = key.split(':');
      docs.push({
        _id: key,
        sessionId, questionId,
        total: b.total,
        correct: b.correct,
        wrongChoices: { ...b.choices },
        avgLatencyMs: b.latencyCount > 0 ? Math.round(b.sumLatency / b.latencyCount) : null,
        lastUpdatedAt: new Date(),
      });
    }
    return docs;
  }

  function reset() { buckets.clear(); }
  function size() { return buckets.size; }

  return { ingest, snapshot, reset, size };
}
