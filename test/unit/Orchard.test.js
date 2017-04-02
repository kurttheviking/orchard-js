/* global describe, it, beforeEach, afterEach */
/* eslint-disable global-require, import/no-extraneous-dependencies, strict */

'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const uuid = require('uuid-with-v6');

describe('Orchard', () => {
  let Orchard;
  let redisClient;

  beforeEach(() => {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    const redis = require('fakeredis');

    redis.fast = true;

    const createClient = redis.createClient;

    redis.createClient = (params) => {
      redisClient = createClient.call(redis, params);

      sinon.spy(redisClient, 'del');
      sinon.spy(redisClient, 'get');
      sinon.spy(redisClient, 'scan');
      sinon.spy(redisClient, 'set');
      sinon.spy(redisClient, 'setex');

      return redisClient;
    };

    mockery.registerMock('redis', redis);

    Orchard = require('../../index');
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.disable();
  });

  it('does not require the new keyword', () => {
    const orchard = Orchard();

    expect(orchard).to.be.a('function');
  });

  it('resolves to an input value', () => {
    const orchard = new Orchard();

    const value = [uuid.v4(), uuid.v4()];

    return orchard(uuid.v4(), value).then((out) => {
      expect(out).to.deep.equal(value);
    });
  });

  it('invokes the priming function once per key', () => {
    const orchard = new Orchard();

    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value).then(() => orchard(key, value))
    .then(() => {
      expect(value.callCount).to.equal(1);
    });
  });

  it('invokes the priming function on all calls with "force" = true', () => {
    const orchard = new Orchard();

    const key = uuid.v4();
    const opts = { force: true };
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value, opts).then(() => orchard(key, value, opts))
    .then(() => {
      expect(value.callCount).to.equal(2);
    });
  });

  it('does not apply a default ttl', () => {
    const orchard = new Orchard();

    const key = uuid.v4();
    const value = [uuid.v4(), uuid.v4()];

    return orchard(key, value).then(() => {
      expect(redisClient.setex.callCount).to.equal(0);
    });
  });

  it('emits a "cache:miss" event for first resolution', () => {
    const orchard = new Orchard();

    const spy = sinon.spy();

    orchard.on('cache:miss', spy);

    const key = uuid.v4();
    const value = [uuid.v4(), uuid.v4()];

    return orchard(key, value).then(() => {
      expect(spy.callCount).to.equal(1);
    });
  });

  it('emits a "cache:hit" event for second resolution', () => {
    const orchard = new Orchard();

    const hitSpy = sinon.spy();
    const missSpy = sinon.spy();

    orchard.on('cache:hit', hitSpy);
    orchard.on('cache:miss', missSpy);

    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value).then(() => orchard(key, value))
    .then(() => {
      expect(hitSpy.callCount).to.equal(1);
      expect(missSpy.callCount).to.equal(1);
    });
  });

  it('supports a "prefix" option', () => {
    const prefix = uuid.v4();

    const orchard = new Orchard({ prefix });

    const key = uuid.v4();
    const value = [uuid.v4(), uuid.v4()];

    return orchard(key, value).then(() => {
      const args = redisClient.set.getCall(0).args;

      expect(args[0]).to.equal(`${prefix}:${key}`);
    });
  });

  it('supports a "ttl" option', () => {
    const orchard = new Orchard({ ttl: '1h' });

    const key = uuid.v4();
    const value = [uuid.v4(), uuid.v4()];

    return orchard(key, value).then(() => {
      expect(redisClient.setex.callCount).to.equal(1);

      const args = redisClient.setex.getCall(0).args;

      expect(args[0]).to.equal(key);
      expect(args[1]).to.equal(3600);
    });
  });

  it('rejects if key is undefined', () => {
    const orchard = new Orchard({ ttl: '1h' });

    return orchard().catch((err) => {
      expect(err).to.match(/missing key/);
    });
  });

  it('rejects if value is undefined', () => {
    const orchard = new Orchard({ ttl: '1h' });

    return orchard(uuid.v4()).catch((err) => {
      expect(err).to.match(/missing value/);
    });
  });
});

describe('Orchard, database disconnect', () => {
  let Orchard;
  let Redis;
  let redis;

  beforeEach(() => {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    redis = {
      on: sinon.spy()
    };

    Redis = sinon.stub().returns(redis);

    mockery.registerMock('./services/Redis', Redis);

    Orchard = require('../../index');
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.disable();
  });

  it('resolves to an input value', () => {
    const orchard = new Orchard();

    const value = [uuid.v4(), uuid.v4()];

    return orchard(uuid.v4(), value).then((out) => {
      expect(out).to.deep.equal(value);
    });
  });

  it('invokes the priming function on every request', () => {
    const orchard = new Orchard();

    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value).then(() => orchard(key, value))
    .then(() => {
      expect(value.callCount).to.equal(2);
    });
  });
});

describe('Orchard, database error', () => {
  let Orchard;
  let Redis;

  beforeEach(() => {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    Redis = sinon.stub().returns({
      on: (evt, cb) => { if (evt === 'error') { cb(); } }
    });

    mockery.registerMock('./services/Redis', Redis);

    Orchard = require('../../index');
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.disable();
  });

  it('resolves to an input value', () => {
    const orchard = new Orchard();

    const value = [uuid.v4(), uuid.v4()];

    return orchard(uuid.v4(), value).then((out) => {
      expect(out).to.deep.equal(value);
    });
  });

  it('invokes the priming function on every call', () => {
    const orchard = new Orchard();

    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value).then(() => orchard(key, value))
    .then(() => {
      expect(value.callCount).to.equal(2);
    });
  });
});
