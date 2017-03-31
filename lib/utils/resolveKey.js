function resolveKey(key) {
  if (typeof key === 'function') {
    return new Promise((resolve, reject) => {
      try {
        return resolve(key()).then(String);
      } catch (err) {
        return reject(err);
      }
    });
  }

  return Promise.resolve(key).then(String);
}

module.exports = resolveKey;
