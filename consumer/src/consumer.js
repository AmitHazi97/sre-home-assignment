//consume TiCDC change messages from Kafka, process them, and log structured to console.
const { Kafka, logLevel } = require('kafkajs');
const { logger } = require('./logger');

// Locally the broker is reached on localhost:29092 (the EXTERNAL listener).
// Inside Docker it will be kafka:9092 (set via the KAFKA_BROKERS env var).
const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:29092').split(',');
const TOPIC = process.env.KAFKA_TOPIC || 'tidb-changes';
const GROUP_ID = process.env.KAFKA_GROUP_ID || 'cdc-consumer';

const kafka = new Kafka({ clientId: 'cdc-consumer', brokers: BROKERS, logLevel: logLevel.NOTHING });
const consumer = kafka.consumer({ groupId: GROUP_ID });

// We only log real row changes. DDL (CREATE/ALTER) and watermark messages are skipped.
const DML = new Set(['INSERT', 'UPDATE', 'DELETE']);

// Never write secrets into the change log. Mask these fields before logging.
const SENSITIVE = new Set(['password_hash', 'password', 'token']);

function redact(rows) {
  if (!Array.isArray(rows)) return rows; // null / undefined pass through unchanged
  return rows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = SENSITIVE.has(key) ? '***REDACTED***' : value;
    }
    return out;
  });
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
  logger.info({ action: 'CONSUMER_STARTED', topic: TOPIC, brokers: BROKERS });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const raw = message.value ? message.value.toString() : '';
      if (!raw) return;

      let evt;
      try {
        evt = JSON.parse(raw);
      } catch (err) {
        logger.warn({ action: 'PARSE_ERROR', error: err.message, raw: raw.slice(0, 200) });
        return;
      }

      // canal-json: isDdl=true for schema changes; type is the operation.
      if (evt.isDdl || !DML.has(evt.type)) return;

      logger.info({
        action: 'DB_CHANGE',
        operation: evt.type,      // INSERT | UPDATE | DELETE
        database: evt.database,
        table: evt.table,
        pk: evt.pkNames || null,
        data: redact(evt.data) || null,   // row after change (the removed row for DELETE)
        old: redact(evt.old) || null,     // previous values (UPDATE only)
      });
    },
  });
}

run().catch((err) => {
  logger.error({ action: 'CONSUMER_FAILED', error: err.message });
  process.exit(1);
});

// Graceful shutdown so the consumer leaves the group cleanly.
['SIGINT', 'SIGTERM'].forEach((sig) =>
  process.on(sig, async () => {
    try { await consumer.disconnect(); } finally { process.exit(0); }
  })
);
