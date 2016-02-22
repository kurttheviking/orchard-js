/* global describe, it */
/* eslint func-names: 0*/
var BPromise = require('bluebird');
var chai = require('chai');

var resolveKey = require('../../../util/resolveKey');

var expect = chai.expect;

function asFunc(val) {
  return function returnVal() {
    return val;
  };
}

describe('util/resolveKey', function () {
  it('rejects with an error when missing key', function () {
    return resolveKey().catch(function (err) {
      expect(err).to.match(/missing required parameter: rawKey/);
    });
  });
  
  it('converts a Boolean to String', function () {
    return resolveKey(true).then(function (observed) {
      expect(observed).to.equal(String(true));
    });
  });

  it('converts a Number to String', function () {
    return resolveKey(3).then(function (observed) {
      expect(observed).to.equal(String(3));
    });
  });

  it('converts a String to String', function () {
    return resolveKey('jaeger').then(function (observed) {
      expect(observed).to.equal('jaeger');
    });
  });

  it('converts a Array to String', function () {
    return resolveKey(['t', 3]).then(function (observed) {
      expect(observed).to.equal('t:3');
    });
  });

  it('converts a Object to String', function () {
    return resolveKey({ t: 3 }).then(function (observed) {
      expect(observed).to.equal('{"t":3}');
    });
  });

  it('converts a Promise<Boolean> to String', function () {
    return resolveKey(BPromise.resolve(true)).then(function (observed) {
      expect(observed).to.equal(String(true));
    });
  });

  it('converts a Promise<Number> to String', function () {
    return resolveKey(BPromise.resolve(3)).then(function (observed) {
      expect(observed).to.equal(String(3));
    });
  });

  it('converts a Promise<String> to String', function () {
    return resolveKey(BPromise.resolve('jaeger')).then(function (observed) {
      expect(observed).to.equal('jaeger');
    });
  });

  it('converts a Promise<Array> to String', function () {
    return resolveKey(BPromise.resolve(['t', 3])).then(function (observed) {
      expect(observed).to.equal('t:3');
    });
  });

  it('converts a Promise<Object> to String', function () {
    return resolveKey(BPromise.resolve({ t: 3 })).then(function (observed) {
      expect(observed).to.equal('{"t":3}');
    });
  });

  it('converts a Function<Boolean> to String', function () {
    return resolveKey(asFunc(true)).then(function (observed) {
      expect(observed).to.equal(String(true));
    });
  });

  it('converts a Function<Number> to String', function () {
    return resolveKey(asFunc(3)).then(function (observed) {
      expect(observed).to.equal(String(3));
    });
  });

  it('converts a Function<String> to String', function () {
    return resolveKey(asFunc('jaeger')).then(function (observed) {
      expect(observed).to.equal('jaeger');
    });
  });

  it('converts a Function<Array> to String', function () {
    return resolveKey(asFunc(['t', 3])).then(function (observed) {
      expect(observed).to.equal('t:3');
    });
  });

  it('converts a Function<Object> to String', function () {
    return resolveKey(asFunc({ t: 3 })).then(function (observed) {
      expect(observed).to.equal('{"t":3}');
    });
  });
});
