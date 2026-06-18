// Same log4js JSON layout as the API, so the consumer logs in the identical structured format.
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

module.exports = { logger: log4js.getLogger() };
