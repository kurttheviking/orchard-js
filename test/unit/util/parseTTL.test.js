/* global describe, it */
/* eslint func-names: 0*/
var chai = require('chai');

var parseTTL = require('../../../util/parseTTL');

var expect = chai.expect;

describe('util/parseTTL', function () {
  it('returns null if no input passed', function () {
    var observed = parseTTL();
    expect(observed).to.equal(null);
  });

  it('converts passed milliseconds to seconds', function () {
    var observed = parseTTL(8600);
    expect(observed).to.equal(8);
  });

  it('converts an interval object to seconds', function () {
    var observed = parseTTL({ hours: 1, minutes: 30 });
    expect(observed).to.equal(60 * 60 + 30 * 60);
  });
});
