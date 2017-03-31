const LRU = require('lru-cache');

function resolveValueFactory(lruOptions) {
  const cache = new LRU(lruOptions);

  function resolveInput(key, value) {
    if (cache.has(key)) {
      return cache.get(key);
    }

    const promisedValue = (typeof value === 'function') ?
      new Promise((resolve, reject) => {
        try {
          return resolve(value(key));
        } catch (err) {
          return reject(err);
        }
      }) :
      Promise.resolve(value);

    cache.set(key, promisedValue);

    return promisedValue;
  }

  function resolveValue(key, value) {
    return resolveInput(key, value)
    .then((finalValue) => { cache.del(key); return finalValue; })
    .catch((err) => { cache.del(key); throw err; });
  }

  return resolveValue;
}

module.exports = resolveValueFactory;
