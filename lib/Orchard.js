'use strict';

const debug = require('debug')('orchard');
const EventEmitter = require('events').EventEmitter;
const ms = require('ms');
const util = require('util');
const uuid = require('uuid-with-v6');

const parseTtl = require('./utils/parseTtl');
const Redis = require('./services/Redis');
const resolveKey = require('./utils/resolveKey');
const resolveValueFactory = require('./utils/resolveValue');

function Orchard(opts) {
  if (!(this instanceof Orchard)) {
    return new Orchard(opts);
  }

  const options = opts || {};
  const self = this;

  EventEmitter.call(self);

  debug('init with options', options);

  const lruOptions = options.lruOptions || { max: 1024, maxAge: ms('1m') };
  const prefix = options.prefix ? String(options.prefix) : '';
  const scanCount = options.scanCount ? Math.abs(parseInt(options.scanCount, 10)) : 10;
  const ttl = parseTtl(options.ttl);
  const url = options.url || 'redis://localhost:6379';

  let isConnected = false;

  const resolveValue = resolveValueFactory(lruOptions);
  const redis = new Redis(url);

  redis.on('ready', () => {
    isConnected = true;

    self.emit('redis:ready');
  });

  redis.on('error', (err) => {
    isConnected = false;

    self.emit('redis:error', err);
  });

  function scanAndDelete(cursor, removedCt, iterationCommands) {
    // [KE] make the current cursor the first element of the executed command array
    //      without modifying the original command array
    const cmds = [cursor].concat(iterationCommands.slice(0));

    return redis.scan(cmds).then((result) => {
      const cursorNew = parseInt(result[0], 10);
      const matchedKeys = result[1];

      return Promise.all(matchedKeys.map(k => redis.del(k))).then((counts) => {
        const updatedRemovedCt = counts.reduce((out, count) => out + count, removedCt);

        // [KE] cursor=0 after fully enumerating the keyspace
        if (cursorNew === 0) {
          return updatedRemovedCt;
        }

        return scanAndDelete(cursorNew, updatedRemovedCt, iterationCommands);
      });
    });
  }

  function cache(key, value) {
    const requestId = uuid.v6();
    const requestTimestamp = Date.now();

    if (key === undefined) {
      return Promise.reject(new Error('missing key'));
    } else if (value === undefined) {
      return Promise.reject(new Error('missing value'));
    }

    debug('[%s] request (connected=%s)', requestId, isConnected);

    return resolveKey(key)
    .then((resolvedKey) => {
      const finalKey = `${prefix || ''}${prefix ? ':' : ''}${resolvedKey}`;

      debug('[%s] key: %s', requestId, finalKey);

      return finalKey;
    })
    .then(finalKey => Promise.all([finalKey, isConnected ? redis.get(finalKey) : null]))
    .then((cachedResult) => {
      const finalKey = cachedResult[0];
      const cachedValue = cachedResult[1];

      if (cachedValue) {
        self.emit('cache:hit', { requestId, key: finalKey, ms: Date.now() - requestTimestamp });

        const finalValue = JSON.parse(cachedValue);

        debug('[%s] cached value', requestId, finalValue);

        return finalValue;
      }

      return resolveValue(finalKey, value).then((primedValue) => {
        self.emit('cache:miss', { requestId, key: finalKey, ms: Date.now() - requestTimestamp });

        debug('[%s] primed value', requestId, primedValue);

        if (!isConnected) {
          return primedValue;
        }

        return redis.set(finalKey, JSON.stringify(primedValue))
        .then(() => {
          // [KE] intentionally async
          if (ttl) {
            redis.expire(finalKey, ttl).catch((err) => {
              debug('[%s] ttl error', requestId, err);
            });
          }

          return primedValue;
        });
      });
    });
  }

  cache.del = function pruneKeyspace(key) {
    return resolveKey(key)
    .then((resolvedKey) => {
      const finalKey = `${prefix || ''}${prefix ? ':' : ''}${resolvedKey}`;

      debug('delete: %s', finalKey);

      return finalKey;
    })
    .then((finalKey) => {
      if (finalKey.endsWith('*')) {
        return scanAndDelete(0, 0, ['MATCH', finalKey, 'COUNT', scanCount]);
      }

      return redis.del(finalKey);
    });
  };

  cache.on = function on() {
    self.on.apply(self, arguments);
  };

  return cache;
}

util.inherits(Orchard, EventEmitter);

module.exports = Orchard;
