const ms = require('ms');

function parseTTL(raw) {
  if (typeof raw === 'string') {
    return parseInt(ms(raw) / 1000, 10);
  } else if (typeof raw === 'number') {
    return parseInt(raw / 1000, 10);
  }

  return null;
}

module.exports = parseTTL;
