'use strict';

var BPromise = require('bluebird');

function resolveValue(resolvedKey, rawValue) {
  return BPromise.try(function invokeValue() {
    if (rawValue === resolvedKey) {
      throw new Error('missing required parameter: resolvedKey');
    } else if (rawValue === undefined) {
      throw new Error('missing required parameter: rawValue');
    }

    return (typeof rawValue === 'function') ? rawValue(resolvedKey) : rawValue;
  });
}

module.exports = resolveValue;
