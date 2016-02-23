/* global describe, it, beforeEach, afterEach */
/* eslint func-names: 0*/
var chai = require('chai');
var mockery = require('mockery');
var sinon = require('sinon');

var expect = chai.expect;

describe('events', function () {
  var cache;
  var client;
  var createClient;
  var redisEvents = {};
  var redis = require('fakeredis');
  var value = 'mark iii';

  createClient = redis.createClient;
  redis.createClient = function () {
    arguments[2].fast = true;
    client = createClient.apply(redis, arguments);

    client.on = function on(evt, listener) {
      redisEvents[evt] = listener;
    };

    return client;
  };

  beforeEach(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    mockery.registerMock('redis', redis);
    cache = require('../../index')();
  });

  it('emits cache:hit', function (done) {
    var key = 'jaeger';
    var start = Date.now();
    var spy = sinon.spy();

    cache.on('cache:hit', spy);

    cache(key, value).then(function () {
      return cache(key, value).delay(10);
    })
    .then(function () {
      var data = spy.args[0][0];

      expect(spy.callCount).to.equal(1);

      expect(data.key).to.equal(key);
      expect(data.ms).to.be.above(0);
      expect(data.ms).to.be.below(Date.now() - start);

      done();
    });
  });

  it('emits cache:miss', function (done) {
    var key = Date.now().toString(36);
    var start = Date.now();
    var spy = sinon.spy();

    cache.on('cache:miss', spy);

    cache(key, value).delay(10).then(function () {
      var data = spy.args[0][0];

      expect(spy.callCount).to.equal(1);

      expect(data.key).to.equal(key);
      expect(data.ms).to.be.above(0);
      expect(data.ms).to.be.below(Date.now() - start);

      done();
    });
  });

  it('emits redis:connect events', function () {
    var key = Date.now().toString(36);
    var spy = sinon.spy();

    cache.on('redis:connect', spy);

    redisEvents.connect();

    return cache(key, value).then(function () {
      expect(spy.callCount).to.equal(1);
    });
  });

  it('emits redis:idle events', function () {
    var key = Date.now().toString(36);
    var spy = sinon.spy();

    cache.on('redis:idle', spy);

    redisEvents.idle();

    return cache(key, value).then(function () {
      expect(spy.callCount).to.equal(1);
    });
  });

  it('emits redis:ready events', function () {
    var key = Date.now().toString(36);
    var spy = sinon.spy();

    cache.on('redis:ready', spy);

    redisEvents.ready();

    return cache(key, value).then(function () {
      expect(spy.callCount).to.equal(1);
    });
  });

  it('emits redis:reconnecting events', function () {
    var key = Date.now().toString(36);
    var spy = sinon.spy();

    cache.on('redis:reconnecting', spy);

    redisEvents.reconnecting();

    return cache(key, value).then(function () {
      expect(spy.callCount).to.equal(1);
    });
  });
});
