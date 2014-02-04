var chai = require('chai');
var should = chai.should();
var sinon = require('sinon');

chai.use(require('sinon-chai'));

var Orchard = require('../index');
var Promise = require('bluebird');

var _redisStoreMock = {};
var _redisMock = {};

_redisMock.createClient = function (redisURI) {
  return {
    del: function (key) {
      delete _redisStoreMock[key];
      return 1;
    },
    expire: sinon.spy(),
    get: function (key, callback) {
      // _getter(key);
      callback(null, _redisStoreMock[key]);
    },
    on: sinon.spy(),
    select: sinon.spy(),
    set: function (key, value) {
      _redisStoreMock[key] = value;
      return true;
    }
  };
};

console.log('[Orchard] Unit Tests');

describe('Bad orchard ->', function () {
  function makeCache () {
    var cache = new Orchard();
  };

  it('throws a TypeError if no redisURI is provided', function () {
    chai.expect(makeCache).to.throw(TypeError);
  });
});

describe('Orchard ->', function () {
  var cache = new Orchard('redis://authcode@192.168.1.1:6379/1', {
      keyPrefix: 'app-cache',
      defaultExpires: {
          days: 10,
          hours: 8,
          minutes: 26,
          seconds: 3
      },
      scanCount: 100,
      // advanced (undocumented) options
      _debug: true,
      _redis: _redisMock
  });

  it('selects a redis database on instantiation', function () {
    cache._redis.select.should.have.been.called;
  });

  it('correctly parses default expirations', function () {
    chai.expect(cache._defaultTTL).equals(894363);
    chai.expect(cache._parseDuration(60)).equals(60);
    chai.expect(cache._parseDuration({hours: 4})).equals(14400);
    chai.expect(cache._parseDuration({days: 90})).equals(7776000);
    chai.expect(cache._parseDuration({minutes: 10, seconds: 30})).equals(630);
  });

  it('correctly sets a key prefix', function () {
    chai.expect(cache._keyPrefix).equals('app-cache:');
  });

  it('correctly sets the scan count', function () {
    chai.expect(cache._scanCount).equals(100);
  });

  describe('reads data through the cache ->', function () {
    var expectedValue = {
      jaeger: 'mark iv',
      keiju: 'gamera'
    };

    var dataFn = sinon.stub().returns(Promise.resolve(expectedValue));
    var expectedCacheState = {'app-cache:jaeger:mark iv': JSON.stringify(expectedValue)};
    var observedValue;

    beforeEach(function (done) {
      var promisedData = cache({
          key: 'jaeger:mark iv',
          expires: 3600
      }, dataFn);

      promisedData.then(function (cachedData) {
        observedValue = cachedData;
        done();
      });
    });

    it('by executing the data gathering function', function () {
      dataFn.should.have.been.called;
    });

    it('obtains the expected read-through data', function () {
      chai.expect(observedValue).deep.equal(expectedValue);
    });

    it('and sets the read-through data for subsequent usage', function () {
      chai.expect(_redisStoreMock).deep.equal(expectedCacheState);
    });
  });

  describe('prunes cached data ->', function () {
    var expectedValue = {
      jaeger: 'mark iv',
      keiju: 'gamera'
    };

    var dataFn = sinon.stub().returns(Promise.resolve(expectedValue));
    var expectedCacheState = {'app-cache:jaeger:mark iv': JSON.stringify(expectedValue)};
    var observedValue;

    beforeEach(function (done) {
      cache({
          key: 'jaeger:mark iv',
          expires: 3600
      }, dataFn).then(function (cachedData) {
        return cache.prune('jaeger:mark iv');
      }).then(function (removedItemCount) {
        observedValue = removedItemCount;
        done();
      });
    });

    it('and removes it from the cache', function () {
      chai.expect(_redisStoreMock).deep.equal({});
    });
  });

});
