// Part 1.2 / 1.3 + Part 3.1: login, token management, and login logging.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { logLogin, logger } = require('./logger');

// POST /api/login  { username, password }   (username may be a username OR an email)
async function login(req, res) {
  const { username, password } = req.body || {};

  // Server-side validation (the client validates too, but never trust the client).
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const [rows] = await pool.query(
    'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, username]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  // Issue a random token and store it in the DB (Part 1.3).
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO tokens (user_id, token) VALUES (?, ?)', [user.id, token]);

  // Part 3.1: structured JSON login log -> timestamp, user ID, action, IP address.
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
  logLogin({ userId: user.id, ip });

  return res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
}

// Auth middleware: token arrives as an HTTP header (Part 1.3).
// Accepts "Authorization: Bearer <token>", "Authorization: <token>", or "x-auth-token: <token>".
async function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || req.headers['x-auth-token'];
  if (!header) return res.status(401).json({ error: 'missing token' });

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  const [rows] = await pool.query(
    `SELECT t.user_id AS id, u.username, u.email
       FROM tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token = ? LIMIT 1`,
    [token]
  );
  if (rows.length === 0) return res.status(401).json({ error: 'invalid token' });

  req.user = rows[0];
  next();
}

module.exports = { login, authMiddleware };
