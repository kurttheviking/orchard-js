/* global describe, it, beforeEach, afterEach */
/* eslint-disable global-require, import/no-extraneous-dependencies, strict */

'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const sinon = require('sinon');
const uuid = require('uuid-with-v6');

describe('services/Redis', () => {
  let Client;
  let clientOn;
  let redis;

  beforeEach(() => {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    clientOn = sinon.spy();

    redis = {
      createClient: sinon.stub().returns({
        on: clientOn,
        del: () => null,
        expire: () => null,
        get: () => null,
        scan: () => null,
        set: () => null
      })
    };

    mockery.registerMock('redis', redis);

    Client = require('../../../lib/services/Redis');
  });

  afterEach(() => {
    mockery.disable();
  });

  it('does not require the `new` keyword', () => {
    function test() {
      return Client(uuid.v4());
    }

    expect(test).to.not.throw(Error);
  });

  it('redis client created with passed url', () => {
    const url = uuid.v4();

    Client(url);

    const args = redis.createClient.getCall(0).args;

    expect(args[0]).to.be.an('object');
    expect(args[0].url).to.equal(url);
  });

  it('Redis#on is a function', () => {
    const client = new Client(uuid.v4());

    expect(client).to.have.property('on');
    expect(client.on).to.be.a('function');
  });

  it('Redis#del is a function', () => {
    const client = new Client(uuid.v4());

    expect(client).to.have.property('del');
    expect(client.del).to.be.a('function');
  });

  it('Redis#expire is a function', () => {
    const client = new Client(uuid.v4());

    expect(client).to.have.property('expire');
    expect(client.expire).to.be.a('function');
  });

  it('Redis#get is a function', () => {
    const client = new Client(uuid.v4());

    expect(client).to.have.property('get');
    expect(client.get).to.be.a('function');
  });

  it('Redis#scan is a function', () => {
    const client = new Client(uuid.v4());

    expect(client).to.have.property('scan');
    expect(client.scan).to.be.a('function');
  });

  it('Redis#set is a function', () => {
    const client = new Client(uuid.v4());

    expect(client).to.have.property('set');
    expect(client.set).to.be.a('function');
  });

  [
    'connect',
    'end',
    'error',
    'ready',
    'warning'
  ].forEach((evt, i) => {
    it(`binds "${evt}" events`, () => {
      Client(uuid.v4());

      const args = clientOn.getCall(i).args;

      expect(args[0]).to.equal(evt);
      expect(args[1]).to.be.a('function');
    });

    it(`proxies "${evt}" events`, () => {
      const client = new Client(uuid.v4());

      const emit = sinon.stub(client, 'emit');
      const fn = clientOn.getCall(i).args[1];

      fn(evt === 'error' ? {} : null);

      expect(emit.callCount).to.equal(1);

      const args = emit.getCall(0).args;

      expect(args[0]).to.equal(evt);
    });
  });
});
