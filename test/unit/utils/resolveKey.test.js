/* global describe, it, beforeEach, afterEach */
/* eslint-disable global-require, import/no-extraneous-dependencies, strict */

'use strict';

const expect = require('chai').expect;
const uuid = require('uuid-with-v6');

const resolveKey = require('../../../lib/utils/resolveKey');

describe('utils/resolveKey', () => {
  it('resolves a key String', () => {
    const key = uuid.v4();

    return resolveKey(key).then((resolvedKey) => {
      expect(resolvedKey).to.equal(key);
    });
  });

  it('resolves a key Promise<String>', () => {
    const key = uuid.v4();

    return resolveKey(Promise.resolve(key)).then((resolvedKey) => {
      expect(resolvedKey).to.equal(key);
    });
  });

  it('resolves a key Number as a String', () => {
    const key = Date.now();

    return resolveKey(key).then((resolvedKey) => {
      expect(resolvedKey).to.equal(String(key));
    });
  });

  it('resolves a key Function returning a String', () => {
    const key = uuid.v4();

    return resolveKey(() => key).then((resolvedKey) => {
      expect(resolvedKey).to.equal(key);
    });
  });

  it('resolves a key Function returning a Promise<String>', () => {
    const key = uuid.v4();

    return resolveKey(() => Promise.resolve(key)).then((resolvedKey) => {
      expect(resolvedKey).to.equal(key);
    });
  });
});
