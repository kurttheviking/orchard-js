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

function Orchard(config) {
  if (!(this instanceof Orchard)) {
    return new Orchard(config);
  }

  const configuration = config || {};
  const self = this;

  EventEmitter.call(self);

  debug('init with config', configuration);

  const herdCacheParams = configuration.herdCacheParams || { max: 1024, maxAge: ms('1m') };
  const keyHash = configuration.keyHash || function keyHashDefault(raw) { return raw; };
  const prefix = configuration.prefix ? String(configuration.prefix) : '';
  const scanCount = configuration.scanCount ? Math.abs(parseInt(configuration.scanCount, 10)) : 10;
  const ttl = parseTtl(configuration.ttl);
  const url = configuration.url || 'redis://localhost:6379';

  let isConnected = false;

  const resolveValue = resolveValueFactory(herdCacheParams);
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

  function cache(key, value, opts) {
    const options = opts || {};
    const requestId = uuid.v6();
    const requestTimestamp = Date.now();

    const force = Boolean(options.force);

    if (key === undefined) {
      return Promise.reject(new Error('missing key'));
    } else if (value === undefined) {
      return Promise.reject(new Error('missing value'));
    }

    debug('[%s] request (connected=%s)', requestId, isConnected);

    return resolveKey(key)
    .then(resolvedKey => Promise.all([resolvedKey, keyHash(resolvedKey)]))
    .then((keyResult) => {
      const rawKey = keyResult[0];
      const hashedKey = keyResult[1];

      const finalKey = `${prefix || ''}${prefix ? ':' : ''}${hashedKey}`;

      debug('[%s] key: %s (%s)', requestId, finalKey, rawKey);

      return [rawKey, finalKey];
    })
    .then((keyResult) => {
      const rawKey = keyResult[0];
      const finalKey = keyResult[1];

      return Promise.all([
        rawKey,
        finalKey,
        (isConnected && !force) ? redis.get(finalKey) : null]
      );
    })
    .then((initialResult) => {
      const rawKey = initialResult[0];
      const finalKey = initialResult[1];
      const cachedValue = initialResult[2];

      if (cachedValue) {
        const finalValue = JSON.parse(cachedValue);

        debug('[%s] cached value', requestId, finalValue);

        self.emit('cache:hit', { requestId, key: finalKey, ms: Date.now() - requestTimestamp });

        return finalValue;
      }

      return resolveValue(rawKey, value).then((primedValue) => {
        debug('[%s] primed value', requestId, primedValue);

        self.emit('cache:miss', { requestId, key: finalKey, ms: Date.now() - requestTimestamp });

        if (!isConnected) {
          return primedValue;
        } else if (ttl) {
          return redis.setex(finalKey, ttl, JSON.stringify(primedValue)).then(() => primedValue);
        }

        return redis.set(finalKey, JSON.stringify(primedValue)).then(() => primedValue);
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
