var BPromise = require('bluebird');
var redis = require('redis');
var redisuri = require('redisuri');

function RedisClient(uri) {
  var options = {};
  var params = redisuri.parse(redisuri.validate(uri));

  if (!(this instanceof RedisClient)) {
    return new RedisClient(uri);
  }

  options.auth_pass = params.auth;
  this.client = redis.createClient(params.port, params.host, options);

  if (params.hasOwnProperty('db') && params.db !== 0) {
    this.client.select(params.db);
  }

  this.on = this.client.on.bind(this.client);

  this.del = BPromise.promisify(this.client.del, { context: this.client });
  this.expire = BPromise.promisify(this.client.expire, { context: this.client });
  this.get = BPromise.promisify(this.client.get, { context: this.client });
  this.ping = BPromise.promisify(this.client.ping, { context: this.client });
  this.scan = BPromise.promisify(this.client.scan, { context: this.client });
  this.set = BPromise.promisify(this.client.set, { context: this.client });
}

module.exports = RedisClient;
