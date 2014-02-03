/*jslint node: true */
'use strict';

var ninvoke = require('ninvoke');
var Promise = require('bluebird');
var redisuri = require('redisuri');
var redis = require('redis');

var KEY_SEPARATOR = ':';


function _connectRedis (redisURI) {
  var conf = redisuri.parse(redisuri.validate(redisURI));
  // redis = redis || require('redis')  // TODO: for testing?

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
  var self = this;  // reduces .bind(this) complications below...

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

  self._redis = _connectRedis(self._redisURI);
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

  return cache;
}


Orchard.prototype.prune = function (keyPattern) {
  var _key = _parsePromisedKey(keyPattern);
};

Orchard.prototype.prunePattern = function (keyPattern) {
  var _key = _parsePromisedKey(keyPattern);
};

// sugar
Orchard.prototype.evict = Orchard.prototype.prune;
Orchard.prototype.evictPattern = Orchard.prototype.prunePattern;

// // classy, since V8 prefers predictable objects.
// function Entry (key, value, lu, length, now) {
//   this.key = key
//   this.value = value
//   this.lu = lu
//   this.length = length
//   this.now = now
// }

module.exports = Orchard;