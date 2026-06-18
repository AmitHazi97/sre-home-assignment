// TiDB speaks the MySQL protocol, so we use the mysql2 driver.
// Connection details come from env vars (localhost for local dev, "tidb" inside Docker).
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appdb',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
