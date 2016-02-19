var chai = require('chai');
var should = chai.should();
var sinon = require('sinon');

chai.use(require('sinon-chai'));

var Orchard = require('../../index');
var Promise = require('bluebird');
var redis = require('redis');

var KEY_PREFIX = 'app-cache';

console.log('[Orchard] Integrated Tests');

describe('Orchard ->', function () {
  var cache = new Orchard('redis://@localhost:6379/0', {
      keyPrefix: KEY_PREFIX,
      defaultExpires: {
          minutes: 60
      },
      // advanced (undocumented) options
      _debug: true
  });

  var _redis = redis.createClient();
  _redis.on('error', function (err) {
    console.error('[Orchard] redis: ' + err);
  });


  describe('reads data through the cache ->', function () {
    var key = KEY_PREFIX + ':jaeger:mark iv';
    var expectedTTL = 3600;
    var expectedValue = {
      jaeger: 'mark iv',
      keiju: 'gamera'
    };

    var dataFn = function () { return Promise.resolve(expectedValue); };
    var observedValue;
    var observedCacheContents;
    var observedTTL;

    beforeEach(function (done) {
      _redis.flushdb(function () {
        var promisedData = cache({
            key: 'jaeger:mark iv',
            expires: expectedTTL
        }, dataFn);

        promisedData.then(function (cachedData) {
          observedValue = cachedData;

          _redis.ttl(key, function (err, ttl) {
            observedTTL = ttl;

            _redis.get(key, function (err, value) {
              observedCacheContents = value;

              done();
            });
          });
        });
      });
    });

    it('obtains the expected read-through data', function () {
      chai.expect(observedValue).deep.equal(expectedValue);
    });

    it('correctly sets the ttl in redis', function () {
      chai.expect(observedTTL).to.be.within(expectedTTL-2, expectedTTL+2);
    });

    it('and sets the read-through data for subsequent usage in redis', function () {
      chai.expect(observedCacheContents).to.equal(JSON.stringify(expectedValue));
    });
  });

  describe('prunes a single cached item ->', function () {
    var key = KEY_PREFIX + ':jaeger:mark iv';
    var expectedValue = {
      jaeger: 'mark iv',
      keiju: 'gamera'
    };

    var dataFn = function () { return Promise.resolve(expectedValue); };
    var observedValue;
    var observedCacheContents;

    beforeEach(function (done) {
      _redis.flushdb(function () {
        cache({
            key: 'jaeger:mark iv',
            expires: 3600
        }, dataFn).then(function (cachedData) {
          return cache.prune('jaeger:mark iv');
        }).then(function (removedItemCount) {
          observedValue = removedItemCount;

          _redis.get(key, function (err, value) {
            observedCacheContents = value;

            done();
          });
        });
      });
    });

    it('and counts the number of removed items', function () {
      chai.expect(observedValue).to.equal(1);
    });

    it('and deletes the key from redis', function () {
      chai.expect(observedCacheContents).to.be.null;
    });
  });

  describe('prunes many cached items ->', function () {
    var keys = [
      'jaeger:mark iii',
      'jaeger:mark iv',
      'keiju:gamera'
    ];

    var vals = [
      'rarpuncher',
      'rarpuncher like WHOA',
      'did kenny lose his turtle?'
    ];

    var observedCachedValues;
    var observedPrunedContents;
    var observedValue;

    beforeEach(function (done) {
      _redis.flushdb(function () {
        // [KE] first prime the cache by mapping over the keys
        //      and inserting the associated values
        Promise.all(keys.map(function (k, i) {
          return cache({
            key: k,
            expires: 3600
          }, function () {
            return Promise.resolve(vals[i]);
          });
        })).then(function (_cachedValues) {
          observedCachedValues = _cachedValues;

          cache.prunePattern('jaeger*').then(function (removedItemCount) {
            observedValue = removedItemCount;

            _redis.get(KEY_PREFIX + keys[0], function (err, value) {
              observedPrunedContents = value;

              // [KE] this is just hygiene... empthing the database on the last test
              _redis.del(KEY_PREFIX + ':' + keys[2], function () {
                done();
              });
            });
          });
        });
      });
    });

    it('caches multiple items in Promise.all', function () {
      chai.expect(vals).to.deep.equal(observedCachedValues);
    });

    it('and deletes two keys from redis', function () {
      chai.expect(observedValue).to.equal(2);
    });

    it('and deletes two keys from redis', function () {
      chai.expect(observedPrunedContents).to.be.null;
    });
  });

});
