/* global describe, it, beforeEach, afterEach */
/* eslint func-names: 0*/
var BPromise = require('bluebird');
var chai = require('chai');
var sinon = require('sinon');

var expect = chai.expect;

describe('errors', function () {
  it('emits redis:error for underlying connection issues', function () {
    var cache;
    var spy = sinon.spy();

    cache = require('../../index')({ url: 'redis://localhost:80/0' });
    cache.on('redis:error', spy);

    return BPromise.delay(50).then(function () {
      expect(spy.callCount).to.be.above(0);
    });
  });

  it('falls through to priming value if allowFailthrough enabled', function () {
    var cache;
    var value = 'Godzilla';

    var stub = sinon.stub().returns(value);

    cache = require('../../index')({
      allowFailthrough: true,
      url: 'redis://localhost:80/0'
    });

    return cache('kaiju', stub).then(function (observed) {
      expect(observed).to.equal(value);
    });
  });
});
