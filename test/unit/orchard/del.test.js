/* global describe, it, beforeEach, afterEach */
/* eslint-disable global-require, import/no-extraneous-dependencies, strict */

'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const uuid = require('uuid-with-v6');

describe('Orchard#del', () => {
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
      sinon.spy(redisClient, 'expire');
      sinon.spy(redisClient, 'get');
      sinon.spy(redisClient, 'scan');
      sinon.spy(redisClient, 'set');

      return redisClient;
    };

    mockery.registerMock('redis', redis);

    Orchard = require('../../../index');
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.disable();
  });

  it('deletes a single key', () => {
    const orchard = new Orchard();

    const key = uuid.v4();
    const value = { x: uuid.v4() };

    return orchard(key, value).then(() => orchard.del(key))
    .then(() => {
      expect(redisClient.del.callCount).to.equal(1);

      const args = redisClient.del.getCall(0).args;

      expect(args[0]).to.equal(key);
    });
  });

  it('returns the count after deleting a single key', () => {
    const orchard = new Orchard();

    const key = uuid.v4();
    const value = { x: uuid.v4() };

    return orchard(key, value).then(() => orchard.del(key))
    .then((out) => {
      expect(out).to.equal(1);
    });
  });

  it('deletes multiple keys', () => {
    const orchard = new Orchard();

    const keyA = `k:${uuid.v6()}`;
    const keyB = `k:${uuid.v6()}`;

    const value = { x: uuid.v4() };

    return Promise.all([
      orchard(keyA, value),
      orchard(keyB, value)
    ])
    .then(() => orchard.del('k:*'))
    .then(() => {
      expect(redisClient.del.callCount).to.equal(2);

      const argsA = redisClient.del.getCall(0).args;

      expect(argsA[0]).to.equal(keyA);

      const argsB = redisClient.del.getCall(1).args;

      expect(argsB[0]).to.equal(keyB);
    });
  });

  it('returns the count after deleting a single key', () => {
    const orchard = new Orchard();

    const keyA = `k:${uuid.v6()}`;
    const keyB = `k:${uuid.v6()}`;

    const value = { x: uuid.v4() };

    return Promise.all([
      orchard(keyA, value),
      orchard(keyB, value)
    ])
    .then(() => orchard.del('k:*'))
    .then((out) => {
      expect(out).to.equal(2);
    });
  });

  it('supports a "prefix" option', () => {
    const prefix = uuid.v4();

    const orchard = new Orchard({ prefix });

    const key = uuid.v4();
    const value = [uuid.v4(), uuid.v4()];

    return orchard(key, value).then(() => orchard.del(key))
    .then(() => {
      expect(redisClient.del.callCount).to.equal(1);

      const args = redisClient.del.getCall(0).args;

      expect(args[0]).to.equal(`${prefix}:${key}`);
    });
  });

  it('accepts a "scanCount" option', () => {
    const orchard = new Orchard({ scanCount: 1 });

    const keyA = `k:${uuid.v6()}`;
    const keyB = `k:${uuid.v6()}`;

    const value = { x: uuid.v4() };

    return Promise.all([
      orchard(keyA, value),
      orchard(keyB, value)
    ])
    .then(() => orchard.del('k:*'))
    .then(() => {
      expect(redisClient.scan.callCount).to.equal(2);
    });
  });
});
