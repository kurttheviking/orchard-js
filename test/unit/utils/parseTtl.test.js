/* global describe, it, beforeEach, afterEach */
/* eslint-disable global-require, import/no-extraneous-dependencies, strict */

'use strict';

const expect = require('chai').expect;

const parseTtl = require('../../../lib/utils/parseTtl');

describe('utils/parseTtl', () => {
  it('returns null if invoked without input', () => {
    const observed = parseTtl();

    expect(observed).to.equal(null);
  });

  it('converts passed milliseconds to seconds', () => {
    const observed = parseTtl(60000);

    expect(observed).to.equal(60);
  });

  it('converts ms string to seconds', () => {
    const observed = parseTtl('1h');

    expect(observed).to.equal(3600);
  });
});
