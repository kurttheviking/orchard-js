/* global describe, it, beforeEach, afterEach */
/* eslint func-names: 0*/
var chai = require('chai');
var mockery = require('mockery');
var sinon = require('sinon');

var expect = chai.expect;

describe('events', function () {
  describe('cache:hit', function () {
    var cache;

    var key = 'jaeger';
    var value = 'mark iii';

    beforeEach(function () {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });

      mockery.registerMock('redis', require('fakeredis'));
      cache = require('../../index')();
    });

    it('emits with correct properties', function (done) {
      var start = Date.now();
      var spy = sinon.spy();

      cache.on('cache:hit', spy);

      cache(key, value).then(function () {
        return cache(key, value).delay(50);
      })
      .then(function () {
        var data = spy.args[0][0];

        expect(spy.callCount).to.equal(1);

        expect(data.key).to.equal(key);
        expect(data.ms).to.be.above(0);
        expect(data.ms).to.be.below(Date.now() - start);

        done();
      });
    });
  });

  describe('cache:miss', function () {
    var cache;

    var key;
    var value = 'mark iii';

    beforeEach(function () {
      key = Date.now().toString(36);

      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });

      mockery.registerMock('redis', require('fakeredis'));
      cache = require('../../index')();
    });

    it('emits with correct properties', function (done) {
      var start = Date.now();
      var spy = sinon.spy();

      cache.on('cache:miss', spy);

      cache(key, value).delay(50).then(function () {
        var data = spy.args[0][0];

        expect(spy.callCount).to.equal(1);

        expect(data.key).to.equal(key);
        expect(data.ms).to.be.above(0);
        expect(data.ms).to.be.below(Date.now() - start);

        done();
      });
    });
  });
});
