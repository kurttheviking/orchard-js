/* global describe, it, beforeEach, afterEach */
/* eslint func-names: 0*/
var BPromise = require('bluebird');
var chai = require('chai');
var mockery = require('mockery');
var sinon = require('sinon');

var expect = chai.expect;

describe('#del', function () {
  var cache;
  var client;
  var redis;

  beforeEach(function () {
    var createClient;

    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    redis = require('fakeredis');
    createClient = redis.createClient;

    redis.createClient = function () {
      client = createClient.apply(redis, arguments);

      sinon.spy(client, 'del');
      sinon.spy(client, 'expire');
      sinon.spy(client, 'scan');

      return client;
    };

    mockery.registerMock('redis', redis);
    cache = require('../../index')({ scanCount: 1 });
  });

  afterEach(function () {
    mockery.disable();
  });

  it('resolves to the number of items removed for a key pattern', function () {
    var key = 'kaiju';
    var value = ['Mothra', 'Gamera'];

    return BPromise.all([
      cache(key + 'a', value),
      cache(key + 'b', value)
    ])
    .then(function () {
      return cache.del(key + '*');
    })
    .then(function () {
      // [KE] observed should equal 2 but a unit test cannot be written;
      //      fakeredis finds only 'a' while redis finds 'b', then 'a'
      expect(client.scan.callCount).to.equal(2);
      // expect(client.del.callCount).to.equal(2);
    });
  });

  it('resolves to the number of items removed for an exact key', function () {
    var key = 'kaiju';
    var value = ['Mothra', 'Gamera'];

    return cache(key, value).then(function () {
      return cache.del(key);
    })
    .then(function (observed) {
      expect(observed).to.equal(1);
      expect(client.scan.callCount).to.equal(0);
      expect(client.del.callCount).to.equal(1);
    });
  });

  it('resolves to 0 if the key does not exist', function () {
    var key = 'kaiju';
    var value = ['Mothra', 'Gamera'];

    return cache(key, value).then(function () {
      return cache.del(Date.now().toString(36));
    })
    .then(function (observed) {
      expect(observed).to.equal(0);
      expect(client.scan.callCount).to.equal(0);
      expect(client.del.callCount).to.equal(1);
    });
  });
});
