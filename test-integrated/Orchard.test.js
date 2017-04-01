/* global describe, it, beforeEach, afterEach */
/* eslint-disable global-require, import/no-extraneous-dependencies, strict */

'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const uuid = require('uuid-with-v6');

const PREFIX = '__ORCHARD_INTEGRATED_TESTS';

describe('Orchard', () => {
  const Orchard = require('../index');

  const orchard = new Orchard({ prefix: PREFIX });

  const hitSpy = sinon.spy();
  const missSpy = sinon.spy();
  const readySpy = sinon.spy();

  orchard.on('cache:hit', hitSpy);
  orchard.on('cache:miss', missSpy);
  orchard.on('redis:ready', readySpy);

  beforeEach(() => {
    hitSpy.reset();
    missSpy.reset();

    orchard.del(`${PREFIX}*`);
  });

  beforeEach(() => {
    orchard.del(`${PREFIX}*`);
  });

  it('resolves to an input value', () => {
    const value = [uuid.v4(), uuid.v4()];

    return orchard(uuid.v4(), value).then((out) => {
      expect(out).to.deep.equal(value);
    });
  });

  it('invokes the priming function once per key', () => {
    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value).then(() => orchard(key, value))
    .then(() => {
      expect(value.callCount).to.equal(1);
    });
  });

  it('emits a "cache:miss" event for first resolution', () => {
    const key = uuid.v4();
    const value = [uuid.v4(), uuid.v4()];

    return orchard(key, value).then(() => {
      expect(missSpy.callCount).to.equal(1);
    });
  });

  it('emits a "cache:hit" event for second resolution', () => {
    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value).then(() => orchard(key, value))
    .then(() => {
      expect(hitSpy.callCount).to.equal(1);
      expect(missSpy.callCount).to.equal(1);
    });
  });

  it('emits a "redis:ready" event', () => {
    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value).then(() => {
      expect(readySpy.callCount).to.equal(1);
    });
  });

  it('deletes a key', () => {
    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value)
    .then(() => orchard.del(key))
    .then(() => orchard(key, value))
    .then(() => {
      expect(value.callCount).to.equal(2);
    });
  });
});

describe('Orchard, no live database', () => {
  const Orchard = require('../index');

  const orchard = new Orchard({ prefix: PREFIX, url: 'redis://localhost:6380' });

  const errorSpy = sinon.spy();

  orchard.on('redis:error', errorSpy);

  beforeEach(() => {
    orchard.del(`${PREFIX}*`);
  });

  beforeEach(() => {
    orchard.del(`${PREFIX}*`);
  });

  it('resolves to an input value', () => {
    const value = [uuid.v4(), uuid.v4()];

    return orchard(uuid.v4(), value).then((out) => {
      expect(out).to.deep.equal(value);
    });
  });

  it('invokes the priming function on every request', () => {
    const key = uuid.v4();
    const value = sinon.stub().returns([uuid.v4(), uuid.v4()]);

    return orchard(key, value).then(() => orchard(key, value))
    .then(() => {
      expect(value.callCount).to.equal(2);
    });
  });

  it('emits a "redis:error" event', () => {
    expect(errorSpy.callCount).to.equal(1);
  });
});
