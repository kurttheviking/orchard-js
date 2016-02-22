'use strict';

var KEY_SEPARATOR = ':';

var BPromise = require('bluebird');

function resolveKey(rawKey, opts) {
  var options = opts || {};

  return BPromise.try(function invokeKey() {
    if (rawKey === undefined) {
      throw new Error('missing required parameter: rawKey');
    }

    return (typeof rawKey === 'function') ? rawKey() : rawKey;
  })
  .then(function resolveKeyComponents(invokedkey) {
    var keyComponents = [];

    if (options.prefix) {
      keyComponents.push(options.prefix);
    }

    keyComponents = keyComponents.concat(invokedkey);

    return BPromise.all(
      keyComponents.map(BPromise.resolve)
    );
  })
  .then(function concatenateKey(keyElements) {
    return keyElements.map(function toString(item) {
      if (Object.prototype.toString.call(item) === '[object Object]') {
        return JSON.stringify(item);
      }

      return String(item);
    }).join(KEY_SEPARATOR);
  });
}

module.exports = resolveKey;
