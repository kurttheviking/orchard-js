/* global describe, it, beforeEach, afterEach */
/* eslint-disable global-require, import/no-extraneous-dependencies, strict */

'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const uuid = require('uuid-with-v6');

const resolveValueFactory = require('../../../lib/utils/resolveValue');

describe('utils/resolveValue', () => {
  const resolveValue = resolveValueFactory({ max: 10, maxAge: 60 * 1000 });

  it('resolves a value String', () => {
    const key = uuid.v4();
    const value = JSON.stringify({ x: uuid.v4() });

    return resolveValue(key, value).then((resolvedValue) => {
      expect(resolvedValue).to.equal(value);
    });
  });

  it('resolves a value Promise<String>', () => {
    const key = uuid.v4();
    const value = JSON.stringify({ x: uuid.v4() });

    return resolveValue(key, Promise.resolve(value)).then((resolvedValue) => {
      expect(resolvedValue).to.equal(value);
    });
  });

  it('resolves a value Function returning a String', () => {
    const key = uuid.v4();
    const value = JSON.stringify({ x: uuid.v4() });

    return resolveValue(key, () => value).then((resolvedValue) => {
      expect(resolvedValue).to.equal(value);
    });
  });

  it('resolves a value Function returning a Promise<String>', () => {
    const key = uuid.v4();
    const value = JSON.stringify({ x: uuid.v4() });

    return resolveValue(key, () => Promise.resolve(value)).then((resolvedValue) => {
      expect(resolvedValue).to.equal(value);
    });
  });

  it('invokes a value Function with the key', () => {
    const key = uuid.v4();
    const value = JSON.stringify({ x: uuid.v4() });

    const valueFn = sinon.stub().returns(value);

    return resolveValue(key, valueFn).then(() => {
      const args = valueFn.getCall(0).args;

      expect(args[0]).to.equal(key);
    });
  });

  it('mitigates thundering herd by caching value function during resolution', () => {
    const key = uuid.v4();
    const value = JSON.stringify({ x: uuid.v4() });

    const valueFn = sinon.stub().returns(new Promise((resolve) => {
      setTimeout(() => resolve(value), 50);
    }));

    return Promise.all([
      resolveValue(key, valueFn),
      resolveValue(key, valueFn)
    ])
    .then(() => {
      expect(valueFn.callCount).to.equal(1);
    });
  });

  it('rejects if value Function throws an error', () => {
    const key = uuid.v4();

    function valueFn() {
      throw new Error('halt');
    }

    return resolveValue(key, valueFn).catch((err) => {
      expect(err).to.match(/halt/i);
    });
  });
});
