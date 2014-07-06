<a href="http://promisesaplus.com/">
    <img src="http://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.0 compliant" align="right" />
</a>

orchard
=======

Application-controlled, Promises/A+ read-through caching via [bluebird](https://github.com/petkaantonov/bluebird) and [redis](https://github.com/antirez/redis)


## Configuration

### Instantiating a new Orchard

Instantiate an Orchard instance by passing a valid [redis URI](https://npmjs.org/package/redisuri) and optionally an `options` object.

For example, the minimalist form:

```
var cache = new Orchard('redis://localhost');
```

Or, a more realistic form:

```
var cache = new Orchard('redis://authcode@192.168.1.1:6379/1', {
    keyPrefix: 'app-cache',
    defaultExpires: 60
});
```

###  Valid `options` parameters

- `keyPrefix`: A string that is preprended to any subseuqently used key. Useful if a single redis database supports caching for multiple services.
- `defaultExpires`: By default, cached data never expires. Use this option to set a default [TTL](http://redis.io/commands/ttl) for all cached keys. (Key-level expiration always supercedes this default.) The value can be either an `Number` represening the number of seconds a key should live, or a duration object. Duration objects should contain one or more of `days`, `hours`, `minutes`, and `seconds` parameters.
- `scanCount`: A `Number` that hints redis' `SCAN` command (e.g. within `prunePattern` described below). Defaults to 10, per redis.

```
var cache = new Orchard('redis://authcode@192.168.1.1:6379/1', {
    keyPrefix: 'app-cache',
    defaultExpires: {
        days: 14,
        hours: 2
    },
    scanCount: 100
});
```

## API

Orchard is optimized for cases where "in-line" cache declarations are desirable -- the logical distinction between "getting" and "setting" activities is minimized. Instead, under a [read-through paradigm](https://www.google.com/search?q=read-through+vs+write-through+cache), "setting" occurs on any cache miss (unless `forceUpdate` is passed) using the data "getter" function. In the case of Orchard, the "getter" should be a [Promise](https://github.com/promises-aplus/promises-spec)-returning function. Failure to provide a "getter" will cause Orchard to immediately throw a `TypeError`.


### Getting & setting data

**Minimalist case**

In this case, an explicit cache key is used and a simple function returns a Promise for a string.

```
var cache = new Orchard('redis://localhost');
var Promise = require('bluebird');

var promisedData = cache('jaeger', function () {
    return Promise.resolve('echo saber');
};

promisedData.then(function (cacheValue) {
    console.log('cacheValue =>', cacheValue); 
});
```


**Intermediate case**

Rather than a string key, Orchard also accepts a key configuration object. The key configuration object must contain a `key` property and, optionally, an `expires` parameter and/or a `forceUpdate` parameter. 

`expires` is an `Number` representing seconds the cached data should live; `expires` overrides the `defaultExpires` set when Orchard was instantiated. 

`forceUpdate` causes Orchard to execute the "getter" function regardless of what is currently in the cache and sets the data for future use, overriding any pre-existing data for that key; `forceUpdate` defaults to `false`.

```
var cache = new Orchard('redis://localhost');
var Promise = require('bluebird');

var promisedData = cache({
    key: 'jaeger:mark iv',
    expires: 3600,
    forceUpdate: false
}, function () {
    return Promise.resolve('echo saber');
};
```

**Complex case**

The `key` property of the key configuration object can also be an `Array` of `String`, `Numbers`, and Promises. Each element of the key array is resolved, then concatenated with a semicolon (e.g. `jaeger:iv:7`). If `keyPrefix` was provided during Orchard instantiation, it is similarly added to the key string (e.g. `app-cache:jaeger:iv:7`). 

In addition, key-level `expires` can be a duration object containing one or more of `days`, `hours`, `minutes`, and `seconds` parameters -- exactly the same mechanics as `defaultExpires` described earlier.

```
var cache = new Orchard('redis://localhost');
var Promise = require('bluebird');
var today = new Date();

var promisedData = cache({
    key: [
        'jaeger',
        req.params.markId,
        Promise.resolve(d.getDay())
    ],
    expires: {
        hours: 12,
        minutes: 45
    },
    forceUpdate: false
}, function () {
    return Promise.resolve('echo saber');
};
```

### Evicting data

Orchard provides two methods for removing data from the cache prior to natural expiration.


**cache.prune(key || keyConfigurationArray)**

`prune` will attempt to [DEL](http://redis.io/commands/del) a key from the cache. Alternatively, `prune` accepts a key configuration array (as described above).

`prune` returns a promise which resolves to the number of keys evicted (1, in the standard use case).

```
cache.prune('jaeger:mark iv');

cache.prune([
    'jaeger',
    req.params.markId,
    Promise.resolve(d.getDay())
]);
```


**cache.prunePattern(keyPattern || keyConfigurationArray)**

`prunePattern` is used to delete all keys matching a valid redis key pattern. This method uses [SCAN](http://redis.io/commands/scan) to iterate over all keys while minimizing blocking actions. The key or key configuration array is used within redis' `MATCH` option while `COUNT` uses either the redis default or `scanCount`, if specified at instantiation. All matching keys are removed with [DEL](http://redis.io/commands/del).

`prunePattern` returns a promise that resolves to the number of keys evicted.

```
cache.prunePattern('jaeger:*');

cache.prunePattern([
    'jaeger',
    req.params.markId,
    '*'
]);
```

Note: If you are not familiar with `SCAN`, the [redis documentation](http://redis.io/commands/scan) provides a thorough discussion about various state concerns.


**evict() and evictPatten()**

If you prefer to avoid the idiomatically-named eviction methods, Orchard also provides `evict` (which aliases `prune`) and `evictPattern` (which aliases `prunePattern`).


## Tests

Orchard provides two-levels of test coverage.

1. `npm run test-unit`: run unit tests against a minimally mocked redis object; this can be run on a machine that does not have redis installed
2. `npm run test-integrated`: run integrated unit tests against `db0` of a redis database on `localhost:6379` (no authentication)

To run all tests (unit and integrated):

```
npm test
```

Fair warning: **the integrated test suite flushes redis** before each test sequence; take care with the environment in which the suite executes.


## Contribute

PRs are welcome! For bugs, please include a failing test which passes when your PR is applied.


## Orchard?

Originally, this project was named "redcache" -- a nice contrast to our in-memory caching layer [bluecache](https://github.com/agilemd/bluecache). Unfortunately, that project name was already claimed on npm (by another redis-related project, unsurprisingly) so instead we turned our attention to things that are red.

"rubycache" confuses languages and "bloodcache" sounds like a bad sequel to a [SAW](http://www.imdb.com/title/tt0387564) movie or a decent prequel to a [Blade](http://www.imdb.com/title/tt0120611/) movie. In any case, we eventually settled on apples which conveniently grow in an orchard. And there you have it: Orchard, a place to grow, prune, and pick data -- fresh from the source.
