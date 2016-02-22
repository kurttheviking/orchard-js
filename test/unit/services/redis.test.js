/* global describe, it */
/* eslint func-names: 0*/
var chai = require('chai');

var RedisClient = require('../../../services/redis');

var expect = chai.expect;

describe('services/redis', function () {
  it('does not require the `new` keyword', function () {
    function test() {
      return require('../../../services/redis')('redis://localhost:6379/0');
    }

    expect(test).to.not.throw(Error);
  });

  it('instance provides #del', function () {
    var client = new RedisClient('redis://localhost:6379/0');
    expect(client).to.have.property('del');
    expect(client.del).to.be.a('function');
  });

  it('instance provides #expire', function () {
    var client = new RedisClient('redis://localhost:6379/0');
    expect(client).to.have.property('expire');
    expect(client.del).to.be.a('function');
  });

  it('instance provides #get', function () {
    var client = new RedisClient('redis://localhost:6379/0');
    expect(client).to.have.property('get');
    expect(client.del).to.be.a('function');
  });

  it('instance provides #scan', function () {
    var client = new RedisClient('redis://localhost:6379/0');
    expect(client).to.have.property('scan');
    expect(client.del).to.be.a('function');
  });

  it('instance provides #set', function () {
    var client = new RedisClient('redis://localhost:6379/0');
    expect(client).to.have.property('set');
    expect(client.del).to.be.a('function');
  });
});
