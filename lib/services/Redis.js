const debug = require('debug')('orchard:redis');
const EventEmitter = require('events').EventEmitter;
const promisify = require('es6-promisify');
const redis = require('redis');
const util = require('util');

function Redis(url) {
  if (!(this instanceof Redis)) {
    return new Redis(url);
  }

  const self = this;

  EventEmitter.call(self);

  debug('init', url);

  const client = redis.createClient({ url });

  [
    'connect',
    'end',
    'error',
    'ready',
    'warning'
  ].forEach((evt) => {
    client.on(evt, (data) => {
      if (data) {
        debug(evt, data);
      } else {
        debug(evt);
      }

      self.emit(evt, data);
    });
  });

  self.del = promisify(client.del, client);
  self.expire = promisify(client.expire, client);
  self.get = promisify(client.get, client);
  self.scan = promisify(client.scan, client);
  self.set = promisify(client.set, client);

  return self;
}

util.inherits(Redis, EventEmitter);

module.exports = Redis;
