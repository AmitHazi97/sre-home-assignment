// run the init function (from main-app-layout) first, then serve the REST API.
const express = require('express');
const { init } = require('./main-app-layout');
const { login, authMiddleware } = require('./auth');
const { logger } = require('./logger');

const PORT = Number(process.env.PORT || 3000);

// Wrapper so async handler/middleware errors are forwarded to Express instead of crashing.
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

async function start() {
  await init(); 
  const app = express();
  app.use(express.json());

  // Health check.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Public: login.
  app.post('/api/login', wrap(login));

  // Protected example: requires a valid token in the header.
  app.get('/api/me', wrap(authMiddleware), (req, res) => res.json({ user: req.user }));

  // Central error handler.
  app.use((err, req, res, next) => {
    logger.error({ action: 'REQUEST_ERROR', path: req.path, error: err.message });
    res.status(500).json({ error: 'internal error' });
  });

  app.listen(PORT, () => logger.info({ action: 'SERVER_STARTED', port: PORT }));
}

start().catch((err) => {
  logger.error({ action: 'STARTUP_FAILED', error: err.message });
  process.exit(1);
});
