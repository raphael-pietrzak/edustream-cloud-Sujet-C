import { Kafka, logLevel } from 'kafkajs';

export async function createProducer(cfg) {
  if (cfg.stubProducer) return stubProducer();
  const kafka = new Kafka({ clientId: cfg.kafka.clientId, brokers: cfg.kafka.brokers, logLevel: logLevel.WARN });
  const producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  return {
    async send(message) {
      await producer.send({ topic: cfg.kafka.topic, messages: [{ key: message.sessionId, value: JSON.stringify(message) }] });
    },
    async disconnect() { await producer.disconnect(); },
    healthy: true,
  };
}

function stubProducer() {
  const buffer = [];
  return {
    async send(message) { buffer.push(message); },
    async disconnect() {},
    healthy: true,
    _buffer: buffer,
  };
}
