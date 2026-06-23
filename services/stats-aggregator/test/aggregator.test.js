import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAggregator } from '../src/aggregator.js';

test('aggregator counts answers per session+question', async () => {
  const agg = createAggregator({ correctChoiceLookup: async () => 1 });
  await agg.ingest({ sessionId: 's1', questionId: 'q1', choice: 1, latencyMs: 1000 });
  await agg.ingest({ sessionId: 's1', questionId: 'q1', choice: 2, latencyMs: 2000 });
  await agg.ingest({ sessionId: 's1', questionId: 'q1', choice: 1, latencyMs: 1500 });

  const docs = agg.snapshot();
  assert.equal(docs.length, 1);
  const doc = docs[0];
  assert.equal(doc.total, 3);
  assert.equal(doc.correct, 2);
  assert.equal(doc.wrongChoices['1'], 2);
  assert.equal(doc.wrongChoices['2'], 1);
  assert.equal(doc.avgLatencyMs, 1500);
});

test('aggregator separates buckets per question', async () => {
  const agg = createAggregator();
  await agg.ingest({ sessionId: 's1', questionId: 'q1', choice: 1 });
  await agg.ingest({ sessionId: 's1', questionId: 'q2', choice: 1 });
  assert.equal(agg.snapshot().length, 2);
});

test('aggregator rejects invalid event', async () => {
  const agg = createAggregator();
  await assert.rejects(() => agg.ingest({}));
});
