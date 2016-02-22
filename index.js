'use strict';

var BPromise = require('bluebird');
var debug = require('debug')('orchard');
var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');

var RedisClient = require('./services/redis');
var parseTTL = require('./util/parseTTL');
var resolveKey = require('./util/resolveKey');
var resolveValue = require('./util/resolveValue');

function Orchard(opts) {
  var options = opts || {};
  var self = this;

  var bus;
  var pending = {};
  var redis;

  debug('init', options);

  if (!(self instanceof Orchard)) {
    return new Orchard(options);
  }

  self.allowFailthrough = !!options.allowFailthrough;
  self.prefix = options.prefix ? String(options.prefix) : '';
  self.scanCount = options.scanCount ? Math.abs(parseInt(options.scanCount, 10)) : 10;
  self.ttl = parseTTL(options.ttl);
  self.url = options.url || 'redis://localhost:6379';

  bus = new EventEmitter();
  redis = new RedisClient(self.url);

  function scanAndDelete(cursor, removedCt, iterationCommands) {
    // [KE] make the current cursor the first element of the executed command array
    //      without modifying the original command array
    var cmds = [cursor].concat(iterationCommands.slice(0));
    var nextRemoveCount = removedCt;

    return redis.scan(cmds).then(function deleteMatches(result) {
      var cursorNew = parseInt(result[0], 10);
      var matchedKeys = result[1];

      return BPromise.all(matchedKeys.map(redis.del)).then(function aggregate(counts) {
        var i;

        for (i = counts.length; i--;) {
          nextRemoveCount += counts[i];
        }

        // [KE] cursor returns to 0 after fully enumerating the keyspace
        if (cursorNew === 0) {
          return nextRemoveCount;
        }

        return scanAndDelete(cursorNew, nextRemoveCount, iterationCommands);
      });
    });
  }

  function cache(key, value, invocationOpts) {
    var config = invocationOpts || {};
    var reqId = uuid.v4();
    var tsInit = Date.now();

    debug('[%s] cache request for: %s', reqId, key);

    function emit(resolvedKey, wasHit) {
      var eventName = wasHit ? 'cache:hit' : 'cache:miss';
      var tsExit = Date.now();

      debug('[%s] emit event: %s for %s', reqId, eventName, resolvedKey);

      bus.emit(eventName, {
        key: resolvedKey,
        ms: tsExit - tsInit
      });
    }

    return resolveKey(key, { prefix: self.prefix }).then(function getValue(parsedKey) {
      debug('[%s] resolved key: %s', reqId, parsedKey);

      return redis.get(parsedKey).then(function checkCacheValue(remoteValue) {
        debug('[%s] remote value: %s', reqId, remoteValue);

        if (remoteValue && !config.forceUpdate) {
          emit(parsedKey, true);
          return JSON.parse(remoteValue);
        } else if (pending[key]) {
          return pending[key];
        }

        pending[key] = resolveValue(
          parsedKey,
          value
        )
        .then(function cacheValue(parsedValue) {
          debug('[%s] primed value: %s', reqId, parsedValue);

          return redis.set(
            parsedKey,
            JSON.stringify(parsedValue)
          )
          .then(function setTTL() {
            var keyTTL = config.ttl ? parseTTL(config.ttl) : self.ttl;

            if (keyTTL) {
              redis.expire(key, keyTTL);
            }

            debug('[%s] set ttl: %s', reqId, keyTTL);

            emit(parsedKey, false);
            delete pending[key];

            return parsedValue;
          });
        });

        return pending[key];
      })
      .catch(function handleError(err) {
        debug('[%s] cache error: %s', reqId, err);

        delete pending[key];

        if (self.allowFailthrough) {
          return resolveValue(parsedKey, value);
        }
      });
    });
  }

  cache.del = function pruneKeyspace(key) {
    return resolveKey(key, { prefix: self.prefix }).then(function remove(parsedKey) {
      var commands;

      if (parsedKey.slice(0, 1) === '*' || parsedKey.slice(-1) === '*') {
        commands = ['MATCH', parsedKey, 'COUNT', self.scanCount];

        return scanAndDelete(0, 0, commands);
      }

      return redis.del(parsedKey);
    });
  };

  cache.on = function on() {
    bus.on.apply(bus, arguments);
  };

  return cache;
}

module.exports = Orchard;
