/*jslint node: true */
'use strict';

var ninvoke = require('ninvoke');
var Promise = require('bluebird');
var redisuri = require('redisuri');

var KEY_SEPARATOR = ':';


function _connectRedis (redisURI, redis) {
  redis = redis || require('redis');

  var conf = redisuri.parse(redisuri.validate(redisURI));
  var client = redis.createClient(conf.port, conf.host, {
    auth_pass: conf.auth
  });

  client.select(conf.db);

  return client;
}

function _parseDuration (duration) {
  var parsed = duration;

  if (typeof duration === 'object') {
    parsed = 0;
    parsed += duration.days ? duration.days * 86400 : 0;
    parsed += duration.hours ? duration.hours * 3600 : 0;
    parsed += duration.minutes ? duration.minutes * 60 : 0;
    parsed += duration.seconds ? duration.seconds : 0;
  }

  return parseInt(parsed, 10);
}

function _parsePromisedKey (key) {
  return new Promise.resolve(key).then(function (_key) {
    if (Array.isArray(_key)) {
      return Promise.all(_key.map(Promise.resolve)).then(function (_keys) {
        return _keys.join(KEY_SEPARATOR);
      });
    }
    else if (typeof _key === 'object') {
      return JSON.stringify(_key);
    }

    return String(key);
  });
}


function Orchard (redisURI, options) {
  var self = this;  // [KE] provide scope clarity; reduces .bind(this) complications...

  if (!(self instanceof Orchard)) {
    return new Orchard(redisURI, options);
  }

  if (!redisURI  || (typeof redisURI !== 'string')) {
    throw new TypeError('Orchard instance requires a redis URI connection string as the first parameter');
  }

  self._redisURI = redisURI;

  if (!options) {
    options = {};
  }

  self._defaultTTL = options.defaultExpires ? _parseDuration(options.defaultExpires) : null;
  self._keyPrefix = options.keyPrefix ? String(options.keyPrefix) + KEY_SEPARATOR : '';
  self._scanCount = options.scanCount ? parseInt(options.scanCount, 10) : null;

  self._redis = _connectRedis(self._redisURI, options._redis);

  self._redis.on('error', function (err) {
    throw err;
  });

  function cache (config, dataFn) {
    var ttl = config.expires ? _parseDuration(config.expires) : self._defaultTTL;
    var forceUpdate = !!config.forceUpdate;

    return _parsePromisedKey(config.key || config)
      .then(function (key) {
        key = self._keyPrefix + key;

        var readThrough = function () {
          return dataFn()
            .then(function (raw) {
              self._redis.set(key, JSON.stringify(raw));

              if (ttl) {
                self._redis.expire(key, ttl);
              }

              return raw;
            });
        };

        if (forceUpdate) {
          return readThrough();
        }

        return ninvoke(self._redis, 'get', key)
          .then(function (data) {
            if (data) {
              return JSON.parse(data);
            }

            return readThrough();
          });
      });
  }

  cache.prune = function (keyPattern) {
    var self = this;

    return _parsePromisedKey(keyPattern)
      .then(function (key) {
        key = self._keyPrefix + key;

        return self._redis.del(key);
      });
  };

  cache.prunePattern = function (keyPattern) {
    var self = this;

    function _scanAndDelete (cursor, removedCt, iterationCommands) {
      // [KE] ensure the current cursor is the first element of the command array
      //       without modifying the source command array
      var cmds = iterationCommands.slice(0).unshift(cursor);

      return ninvoke(self._redis, 'scan', cmds)
        .then(function (result) {
          var cursorNew = parseInt(result[0], 10);
          var keys = result[1] || [];

          return Promise.all(keys.map(function (k) {
            return self._redis.del(k);
          })).then(function (counts) {
            removedCt += counts.reduce(function (previousValue, currentValue) { return previousValue + currentValue; }, 0);

            // [KE] per redis, cursor returns to 0 once it has fully iterated through the keyspace
            if (cursorNew === 0) {
              return removedCt;
            }

            return _scanAndDelete(cursorNew, removedCt, iterationCommands);
          });

        });
    }

    return _parsePromisedKey(keyPattern)
      .then(function (key) {
        key = self._keyPrefix + key;

        var cmds = ['MATCH', key];

        if (self._scanCount) {
          cmds.push('COUNT');
          cmds.push(self._scanCount);
        }

        // _scanAndDelete(cursor, removedCt, iterationCommands)
        return _scanAndDelete(0, 0, cmds);
      });
  };

  // sugar
  cache.evict = cache.prune;
  cache.evictPattern = cache.prunePattern;

  // [KE] eventually, this should expost other logging functionality
  if (options._debug) {
    cache._redis = self._redis;
    cache._defaultTTL = self._defaultTTL;
    cache._keyPrefix = self._keyPrefix;
    cache._parseDuration = _parseDuration;
    cache._parsePromisedKey = _parsePromisedKey;
    cache._scanCount = self._scanCount;
  }

  return cache;
}

module.exports = Orchard;
