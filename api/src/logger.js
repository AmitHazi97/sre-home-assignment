// log4js is required by the assignment (Part 3.1).
// We define a custom JSON layout so every log line is a structured JSON object.
const log4js = require('log4js');

log4js.addLayout('json', () => (logEvent) => {
  const out = {
    timestamp: logEvent.startTime.toISOString(),
    level: logEvent.level.levelStr,
    category: logEvent.categoryName,
  };
  const [first, ...rest] = logEvent.data;
  if (first && typeof first === 'object') {
    Object.assign(out, first);
    if (rest.length) out.extra = rest;
  } else {
    out.message = logEvent.data.join(' ');
  }
  return JSON.stringify(out);
});

log4js.configure({
  appenders: { console: { type: 'stdout', layout: { type: 'json' } } },
  categories: { default: { appenders: ['console'], level: 'info' } },
});

const logger = log4js.getLogger();

// Part 3.1: every login writes a JSON log with timestamp, user ID, action, IP address.
// (timestamp + level are added by the layout above.)
function logLogin({ userId, ip }) {
  logger.info({ action: 'LOGIN', userId, ip });
}

module.exports = { logger, logLogin };
