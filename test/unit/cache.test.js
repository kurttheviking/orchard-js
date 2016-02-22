/* global describe, it, beforeEach, afterEach */
/* eslint func-names: 0*/
var BPromise = require('bluebird');
var chai = require('chai');
var mockery = require('mockery');
var sinon = require('sinon');

var expect = chai.expect;

describe('cache', function () {
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
      sinon.spy(client, 'get');
      sinon.spy(client, 'scan');
      sinon.spy(client, 'set');

      return client;
    };

    mockery.registerMock('redis', redis);
    cache = require('../../index')();
  });

  afterEach(function () {
    mockery.disable();
  });

  it('stores and returns a value', function () {
    var value = ['Mothra', 'Gamera'];

    return cache('kaiju', value).then(function (observed) {
      expect(observed).to.deep.equal(value);
    });
  });

  it('stores and returns the value from a Promise', function () {
    var value = 'Rodan';

    return cache('kaiju', BPromise.resolve(value)).then(function (observed) {
      expect(observed).to.equal(value);
    });
  });

  it('stores and returns the value from a Function', function () {
    var value = { nuclear: 'Godzilla' };

    return cache('kaiju', function () { return value; }).then(function (observed) {
      expect(observed).to.deep.equal(value);
    });
  });

  it('stores and returns the value from a Function<Promise>', function () {
    var value = 32;
    function primingValue() { return BPromise.resolve(value); }

    return cache('kaiju', primingValue).then(function (observed) {
      expect(observed).to.equal(value);
    });
  });

  it('invokes the priming function only once', function () {
    var value = 32;
    var primingValue = sinon.stub().returns(value);

    return cache('kaiju', primingValue).then(function () {
      return cache('kaiju', primingValue);
    })
    .then(function () {
      expect(primingValue.callCount).to.equal(1);
    });
  });

  it('by default, does not apply a ttl', function () {
    var value = ['Mothra', 'Gamera'];

    return cache('kaiju', value).then(function () {
      expect(client.expire.callCount).to.equal(0);
    });
  });

  it('accepts a key-level option.ttl', function () {
    var ttl = Math.floor(Math.random() * (40000 + 1) + 10000);
    var value = 'Godzilla';

    return cache('kaiju', value, { ttl: ttl }).then(function () {
      expect(client.expire.callCount).to.equal(1);
      expect(client.expire.args[0][1]).to.equal(parseInt(ttl / 1000, 10));
    });
  });
});
