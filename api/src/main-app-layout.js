// the app's init function lives in a file called main-app-layout.
// init() runs automatically on startup:
//   1. waits until TiDB is reachable (important inside Docker, where the API may start first)
//   2. applies db/schema.sql  -> creates the database + tables
//   3. applies db/seed.sql    -> creates the default user
// It is idempotent: safe to run on every boot (CREATE ... IF NOT EXISTS / ON DUPLICATE KEY).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { logger } = require('./logger');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 4000);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

const SCHEMA_PATH = process.env.SCHEMA_PATH || path.join(__dirname, '../../db/schema.sql');
const SEED_PATH = process.env.SEED_PATH || path.join(__dirname, '../../db/seed.sql');

async function waitForDb(retries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mysql.createConnection({
        host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD,
      });
      await conn.ping();
      await conn.end();
      return;
    } catch (err) {
      logger.info({ action: 'DB_WAIT', attempt, error: err.code || err.message });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`TiDB not reachable at ${DB_HOST}:${DB_PORT} after ${retries} attempts`);
}

async function runSqlFile(conn, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await conn.query(sql);
}

async function init() {
  logger.info({ action: 'APP_INIT_START' });
  await waitForDb();

  // multipleStatements lets us run a whole .sql file in one call.
  // No `database` set yet because schema.sql is what creates it.
  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD,
    multipleStatements: true,
  });

  await runSqlFile(conn, SCHEMA_PATH);
  logger.info({ action: 'SCHEMA_APPLIED' });

  await runSqlFile(conn, SEED_PATH);
  logger.info({ action: 'SEED_APPLIED' });

  await conn.end();
  logger.info({ action: 'APP_INIT_DONE' });
}

module.exports = { init };
