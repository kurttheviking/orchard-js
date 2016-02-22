'use strict';

var interval = require('interval');

function parseTTL(raw) {
  if (typeof raw === 'object') {
    return parseInt(interval(raw) / 1000, 10);
  } else if (typeof raw === 'number') {
    return parseInt(raw / 1000, 10);
  }

  return null;
}

module.exports = parseTTL;
