orchard
=======

[![Build Status](https://travis-ci.org/kurttheviking/orchard.svg?branch=master)](https://travis-ci.org/kurttheviking/orchard)

Application-controlled, Redis-backed, Promises/A+ read-through caching


## Use

First, instantiate the cache with desired [options](https://github.com/kurttheviking/orchard#options).

```js
var Orchard = require('orchard');
var options = {
  keyPrefix: 'app-cache',
  ttl: {hours: 1},
  url: 'redis://auth@10.0.100.0:6379/1'
};

var cache = Orchard(options);
```

Cache "getting" and "setting" takes place within a single call, promoting functional use. The `cache` instance is a Promise-returning function which takes two parameters: a cache `key` and a priming `value`.

```js
cache(Promise.resolve('kaiju'), function (key) {
  console.log("the invoked key is " + cacheKey);  // "the invoked key is dinosaurs"
  return Promise.resolve(['Godzilla', 'Mothra', 'Rodan']);
})
.then(function (value) {
  console.log("the cached value is " + value);  // "the resolved value is ['Godzilla', ...]"
});
```

## Options

| Option | Expected value |
| :------- | :----------- |
| `allowFailthrough` | By default, Orchard exposes connection and database errors from Redis via a rejected Promise. Set this option to `true` to ignore these errors and invoke the priming value without persisting the result when these errors occur. |
| `keyPrefix` | A string that is prepended to all cache keys encountered by the `cache` instance. Useful if a single Redis database supports caching for multiple services. |
| `scanCount` | A `Number` that hints Redis' `SCAN` command (e.g. within `del` described below). Defaults to 10, per Redis. |
| `ttl` | By default, cached data never expires. Use this option to set a default [TTL](http://redis.io/commands/ttl) for all cached keys. Key-level expiration always supersedes this default. The value can be either a `Number` representing lifespan in milliseconds or a valid [interval object](https://www.npmjs.com/package/interval). |
| `url` | A valid [Redis URI](https://npmjs.org/package/redisuri); defaults to 'redis://localhost:6379/0'. |

Note: [Redis uses seconds for expiration timers](http://redis.io/commands/expire); Orchard internally converts `ttl` from milliseconds to seconds, rounding down.


## API

#### `cache(key, primingValue, [options])`

Attempts to get the current value of `key` from the cache. If the key does not exist, the `primingValue` is determined and the underlying cache value is set. If the `primingValue` is a function, it is invoked with the resolved `key` as its single argument.

Both `key` and `primingValue` can be a Boolean, Number, String, Array, Object, or a function that returns one of these primitives, or a Promise for one of these primitives. The `cache` instance stores a memo for a promised value while the value is being resolved in order to mitigate a [stampede](https://en.wikipedia.org/wiki/Cache_stampede) for the underlying `primingValue` at the expense of local memory. However, a stampede may still occur against a `key` function because it is invoked on each cache call. In most cases, this problem is mitigated by using a locally available key. If you plan to remotely resolve the key you may want to consider caching the key function as well.

A rejected promise is returned if `key` is missing or if there is an error resolving the `primingValue`. Rejected cache calls are not persisted in Redis.

At invocation, the following options are available:

| Option | Expected value |
| :------- | :----------- |
| `forceUpdate` | Determine the priming value and update Redis ignoring any previously cached data |
| `ttl` | Key-specific TTL override of the instance TTL; either a `Number` representing lifespan in milliseconds or a valid [interval object](https://www.npmjs.com/package/interval) |

#### `cache#del(key)`

Returns a promise that resolves to the number of removed keys after deleting `key` from Redis. If the first or last character of the resolved `key` is an asterisk (`*`), the key is treated as a pattern and the `SCAN` command is used to find all matching keys via Redis' `MATCH` option and either the default iteration count or the configured `scanCount`. The instance's `keyPrefix` is not applied in cases with a leading `MATCH` pattern indicator (`*`).

#### `cache#on(eventName, eventHandler)`

`eventName` is a string, corresponding to a [supported event](https://github.com/kurttheviking/orchard#emitted-events). `eventHandler` is a function which responds to the data provided by the target event.

```js
cache.on('cache:hit', function eventHandler(data) {
  console.log('The cache took ' + data.ms + ' milliseconds to respond.');
});
```


## Emitted events

The cache instance is also an [event emitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) which provides an `on` method against which the implementing application can listen for the below events.

#### cache:hit

```js
{
  'key': <String>,
  'ms': <Number:Integer:Milliseconds>
}
```

Note: `ms` is milliseconds elapsed between cache invocation and final resolution of the cached value.

#### cache:miss

```js
{
  'key': <String>,
  'ms': <Number:Integer:Milliseconds>
}
```

Note: `ms` is milliseconds elapsed between cache invocation and final resolution of the priming value.


## Debug

This module is instrumented with [debug](https://www.npmjs.com/package/debug) to provide information about cache behavior during development. All debug invocations use the `orchard` prefix for targeted debug output:

```js
DEBUG=orchard* npm test
```


## Changes from v0

- [breaking] Moved key-level options to third argument of the cache call
- [breaking] `#prune` (`#evict`) and `#prunePattern` (`#evictPattern`) consolidated into `#del`
- [breaking] Renamed instance and key-level arguments (e.g. `keyPrefix` &rarr; `prefix`, `expires` &rarr; `ttl`)
- [minor] Generalized key and priming values to any primitive, Promise, or Function
- [patch] Addressed thundering herd risk
- [patch] Upgraded dependencies
- [patch] Reorganized and expanded test suite


## Contribute

PRs are welcome! For bugs, please include a failing test which passes when your PR is applied.


## Tests

To run the linter and unit test suite:

```sh
npm test
```

Or, to determine unit test coverage:

```sh
npm run coverage
```

This project maintains 100% coverage of statements, branches, and functions.

Finally, an integrated test suite executes tests against a live, local database (`redis://localhost:6379/0`):

```sh
npm run test-live
```

**WARNING: the integrated test suite flushes Redis** before each test sequence.


## Orchard?

Originally, this project was named "redcache" -- a nice contrast to the in-memory caching layer [bluecache](https://github.com/agilemd/bluecache). Unfortunately, that project name was already claimed on npm (by another Redis-related project, unsurprisingly) so attention shifted to things that are red.

"rubycache" confuses languages and "bloodcache" sounds like a bad sequel to a [SAW](http://www.imdb.com/title/tt0387564) movie or a decent prequel to a [Blade](http://www.imdb.com/title/tt0120611/) movie. In any case, apples are red and they grow in an orchard. And there you have it: [Orchard](https://www.npmjs.com/package/orchard), a place to grow, prune, and pick data &ndash; fresh from the source.
