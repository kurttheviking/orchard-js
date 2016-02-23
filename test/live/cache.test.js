/* global describe, it, beforeEach, afterEach */
/* eslint func-names: 0*/
var BPromise = require('bluebird');
var chai = require('chai');
var mockery = require('mockery');
var redis = require('redis');
var sinon = require('sinon');

var expect = chai.expect;

describe('cache', function () {
  var cache;
  var conn = redis.createClient();

  var keys = BPromise.promisify(conn.keys, { context: conn });

  beforeEach(function (done) {
    cache = require('../../index')();
    conn.flushdb(done);
  });

  afterEach(function () {
    mockery.disable();
  });

  it('stores and returns a value', function () {
    var key = 'kaiju';
    var value = ['Godzilla', 'Mothra', 'Gamera', 'Rodan'];

    return cache(key, value).then(function (cachedValue) {
      return keys('*').then(function (liveKeys) {
        expect(cachedValue).to.deep.equal(value);
        expect(liveKeys).to.deep.equal([key]);
      });
    });
  });

  it('deletes an exact key', function () {
    var key = 'kaiju';
    var value = ['Godzilla', 'Mothra', 'Gamera', 'Rodan'];

    return cache(key, value).then(function () {
      return cache.del(key);
    })
    .then(function (deleteCount) {
      return keys('*').then(function (liveKeys) {
        expect(deleteCount).to.equal(1);
        expect(liveKeys.length).to.equal(0);
      });
    });
  });

  it('deletes multiple keys from a pattern', function () {
    var key = 'kaiju';
    var value = ['Godzilla', 'Mothra', 'Gamera', 'Rodan'];

    cache = require('../../index')({ scanCount: 1 });

    return BPromise.all([
      cache(key + 'a', value),
      cache(key + 'b', value)
    ])
    .then(function () {
      return cache.del(key + '*');
    })
    .then(function (deleteCount) {
      return keys('*').then(function (liveKeys) {
        expect(deleteCount).to.equal(2);
        expect(liveKeys.length).to.equal(0);
      });
    });
  });

  it('deletes only matched keys from a pattern', function () {
    var key = 'kaiju';
    var value = ['Godzilla', 'Mothra', 'Gamera', 'Rodan'];

    cache = require('../../index')({ scanCount: 1 });

    return BPromise.all([
      cache('monsters', value),
      cache(key + 'x', value)
    ])
    .then(function () {
      return cache.del(key + '*');
    })
    .then(function (deleteCount) {
      return keys('*').then(function (liveKeys) {
        expect(deleteCount).to.equal(1);
        expect(liveKeys.length).to.equal(1);
      });
    });
  });

  it('invokes the priming function once per key', function () {
    var key = 'kaiju';
    var value = sinon.stub().returns(['Godzilla', 'Mothra', 'Gamera', 'Rodan']);

    return cache(key, value).then(function () {
      return cache(key, value);
    })
    .then(function () {
      expect(value.callCount).to.equal(1);
    });
  });
});
