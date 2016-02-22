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
  .then(function concatenateKey(keyItems) {
    return keyItems.map(function toString(item) {
      if (Object.prototype.toString.call(item) === '[object Object]') {
        return JSON.stringify(item);
      }

      return String(item);
    });
  })
  .then(function checkForLeadingPattern(keyItems) {
    var parsedKeyItems = keyItems;

    // [KE] if both prefix and a leading MATCH pattern were specified, ignore the prefix;
    //      processed ex post because of the promise/primitive type resolution requirement
    if (options.prefix && keyItems.length > 1 && keyItems[1].slice(0, 1) === '*') {
      parsedKeyItems = keyItems.slice(1);
    }

    return parsedKeyItems.join(KEY_SEPARATOR);
  });
}

module.exports = resolveKey;
