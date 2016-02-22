/* global describe, it, beforeEach, afterEach */
/* eslint func-names: 0*/
var BPromise = require('bluebird');
var chai = require('chai');
var mockery = require('mockery');
var redis = require('redis');

var expect = chai.expect;

describe('cache', function () {
  var cache;
  var conn = redis.createClient();

  // var get = BPromise.promisify(conn.get, { context: conn });
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
});
