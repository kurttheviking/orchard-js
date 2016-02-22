/* global describe, it */
/* eslint func-names: 0*/
var BPromise = require('bluebird');
var chai = require('chai');
var sinon = require('sinon');

var resolveValue = require('../../../util/resolveValue');

var expect = chai.expect;

describe('util/resolveValue', function () {
  var key = Date.now().toString(36);

  it('rejects with an error when missing key', function () {
    return resolveValue().catch(function (err) {
      expect(err).to.match(/missing required parameter: resolvedKey/);
    });
  });

  it('rejects with an error when missing priming value', function () {
    return resolveValue(key).catch(function (err) {
      expect(err).to.match(/missing required parameter: rawValue/);
    });
  });

  it('resolves a Boolean', function () {
    return resolveValue(key, true).then(function (observed) {
      expect(observed).to.equal(true);
    });
  });

  it('resolves a Number', function () {
    return resolveValue(key, 3).then(function (observed) {
      expect(observed).to.equal(3);
    });
  });

  it('resolves a String', function () {
    return resolveValue(key, 'jaeger').then(function (observed) {
      expect(observed).to.equal('jaeger');
    });
  });

  it('resolves an Array', function () {
    return resolveValue(key, ['t', 3]).then(function (observed) {
      expect(observed).to.deep.equal(['t', 3]);
    });
  });

  it('resolves an Object', function () {
    return resolveValue(key, { t: 3 }).then(function (observed) {
      expect(observed).to.deep.equal({ t: 3 });
    });
  });

  it('resolves a Promise<Boolean>', function () {
    return resolveValue(key, BPromise.resolve(true)).then(function (observed) {
      expect(observed).to.equal(true);
    });
  });

  it('resolves a Promise<Number>', function () {
    return resolveValue(key, BPromise.resolve(3)).then(function (observed) {
      expect(observed).to.equal(3);
    });
  });

  it('resolves a Promise<String>', function () {
    return resolveValue(key, BPromise.resolve('jaeger')).then(function (observed) {
      expect(observed).to.equal('jaeger');
    });
  });

  it('resolves a Promise<Array>', function () {
    return resolveValue(key, BPromise.resolve(['t', 3])).then(function (observed) {
      expect(observed).to.deep.equal(['t', 3]);
    });
  });

  it('resolves a Promise<Object>', function () {
    return resolveValue(key, BPromise.resolve({ t: 3 })).then(function (observed) {
      expect(observed).to.deep.equal({ t: 3 });
    });
  });

  it('resolves a Function<Boolean>', function () {
    var val = false;
    var spy = sinon.stub().returns(val);

    return resolveValue(key, spy).then(function (observed) {
      expect(spy.args[0][0]).to.equal(key);
      expect(observed).to.deep.equal(val);
    });
  });

  it('resolves a Function<Number>', function () {
    var val = 5;
    var spy = sinon.stub().returns(val);

    return resolveValue(key, spy).then(function (observed) {
      expect(spy.args[0][0]).to.equal(key);
      expect(observed).to.deep.equal(val);
    });
  });

  it('resolves a Function<String>', function () {
    var val = 'keiju';
    var spy = sinon.stub().returns(val);

    return resolveValue(key, spy).then(function (observed) {
      expect(spy.args[0][0]).to.equal(key);
      expect(observed).to.deep.equal(val);
    });
  });

  it('resolves a Function<Array>', function () {
    var val = ['t', 5];
    var spy = sinon.stub().returns(val);

    return resolveValue(key, spy).then(function (observed) {
      expect(spy.args[0][0]).to.equal(key);
      expect(observed).to.deep.equal(val);
    });
  });

  it('resolves a Function<Object>', function () {
    var val = { t: 5 };
    var spy = sinon.stub().returns(val);

    return resolveValue(key, spy).then(function (observed) {
      expect(spy.args[0][0]).to.equal(key);
      expect(observed).to.deep.equal(val);
    });
  });
});
