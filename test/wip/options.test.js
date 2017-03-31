/* global describe, it, beforeEach, afterEach */
/* eslint-disable global-require, import/no-extraneous-dependencies, strict */

'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const uuid = require('uuid-with-v6');

describe('Orchard options', () => {
  var client;
  var createClient;
  var redis;

  beforeEach(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    redis = require('fakeredis');

    sinon.spy(redis, 'createClient');
    createClient = redis.createClient;

    redis.createClient = function () {
      arguments[2].fast = true;
      client = createClient.apply(redis, arguments);

      sinon.spy(client, 'expire');
      sinon.spy(client, 'get');
      sinon.spy(client, 'scan');
      sinon.spy(client, 'select');
      sinon.spy(client, 'set');

      return client;
    };

    mockery.registerMock('redis', redis);
  });

  afterEach(function () {
    mockery.disable();
  });

  it('does not require the `new` keyword', function () {
    var cache = require('../../index')();

    expect(cache).to.be.a('function');
    expect(global.bcache).to.equal(undefined);
  });

  it('accepts options.prefix', function () {
    var prefix = Date.now().toString(36);

    var cache = require('../../index')({ prefix: prefix });

    return cache('kaiju', 'Godzilla').then(function () {
      var args = client.get.getCall(0).args;
      expect(args[0].indexOf(prefix)).to.equal(0);
    });
  });

  it('options.prefix defaults to an empty string', function () {
    var cache = require('../../index')();

    return cache('kaiju', 'Godzilla').then(function () {
      var args = client.get.getCall(0).args;
      expect(args[0]).to.equal('kaiju');
    });
  });

  it('accepts options.ttl', function () {
    var ttl = Math.floor(Math.random() * (40000 + 1) + 10000);
    var cache = require('../../index')({ ttl: ttl });

    return cache('kaiju', 'Godzilla').then(function () {
      var args = client.expire.getCall(0).args;
      expect(args[1]).to.equal(parseInt(ttl / 1000, 10));
    });
  });

  it('accepts options.url', function () {
    var cache = require('../../index')({ url: 'redis://jenny@8.6.7.5:30/9' });

    var args = createClient.getCall(0).args;

    expect(cache).to.be.a('function');
    expect(client.select.getCall(0).args[0]).to.equal(9);

    expect(args[0]).to.equal(30);
    expect(args[1]).to.equal('8.6.7.5');
    expect(args[2].auth_pass).to.equal('jenny');
  });

  it('bad options.url throws synchronously', function () {
    function test() {
      var cache = require('../../index')({ url: 'jenny@8.6.7.5:30/9' });
      return cache;
    }

    expect(test).to.throw(TypeError);
  });

  it('options.url defaults to redis://localhost:6379/0', function () {
    var cache = require('../../index')();

    var args = createClient.getCall(0).args;

    expect(cache).to.be.a('function');
    expect(client.select.callCount).to.equal(0);

    expect(args[0]).to.equal(6379);
    expect(args[1]).to.equal('localhost');
    expect(args[2].auth_pass).to.equal(null);
  });

  it('accepts options.scanCount', function () {
    var count = parseInt(100 * Math.random(), 10);
    var cache = require('../../index')({ scanCount: count });

    return cache.del('kaiju:*').then(function () {
      var cmds = client.scan.getCall(0).args[0];
      expect(cmds[4]).to.equal(count);
    });
  });

  it('options.scanCount defaults to 10', function () {
    var cache = require('../../index')();

    return cache.del('kaiju:*').then(function () {
      var cmds = client.scan.getCall(0).args[0];
      expect(cmds[4]).to.equal(10);
    });
  });

  it('options.scanCount is treated as absolute number', function () {
    var count = parseInt(100 * Math.random(), 10);
    var cache = require('../../index')({ scanCount: -1 * count });

    return cache.del('kaiju:*').then(function () {
      var cmds = client.scan.getCall(0).args[0];
      expect(cmds[4]).to.equal(count);
    });
  });
});

describe('options.allowFailthrough', function () {
  var client;
  var createClient;
  var redis;

  beforeEach(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    redis = require('fakeredis');

    sinon.spy(redis, 'createClient');
    createClient = redis.createClient;

    redis.createClient = function () {
      client = createClient.apply(redis, arguments);
      client.get = sinon.stub().throws(new TypeError('halt'));

      return client;
    };

    mockery.registerMock('redis', redis);
  });

  afterEach(function () {
    mockery.disable();
  });

  it('defaults to rejecting on Error', function () {
    var cache = require('../../index')();

    return cache('kaiju', 'Godzilla').catch(function (err) {
      expect(err).to.match(/halt/);
    });
  });

  it('returns the cached value if enabled', function () {
    var cache = require('../../index')({ allowFailthrough: true });

    return cache('kaiju', 'Godzilla').then(function (observed) {
      expect(observed).to.equal('Godzilla');
    });
  });
});
