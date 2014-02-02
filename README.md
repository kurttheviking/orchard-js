<a href="http://promisesaplus.com/">
    <img src="http://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.0 compliant" align="right" />
</a>

orchard
=======

Application-controlled, Promises/A+, read-through caching via [bluebird](https://github.com/petkaantonov/bluebird) and [redis](https://github.com/antirez/redis)


## Motivation

Because awesome.


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
- `defaultExpires`: By default, cached data never expires. Use this option to set a default [TTL](http://redis.io/commands/ttl) for all cached keys. (Key-level expiration always supercedes this default.) The value can be either an `Number` represening the number of seconds a key should live, or a duration object. Duration objects should contain one or more of `days`, `hours`, `minutes`, and `seconds` parameters:

```
var cache = new Orchard('redis://authcode@192.168.1.1:6379/1', {
    keyPrefix: 'app-cache',
    defaultExpires: {
        days: 14,
        hours: 2
    }
});
```

## API

Orchard's is optimized for cases where "in-line" cache declarations are desirable. There is no logical separation between "getting" and "setting" activities. Instead, under a [read-through paradigm](https://www.google.com/search?q=read-through+vs+write-throgh+cache), "setting" occurs on any cache miss (unless `forceUpdate` is passed) using the "getter" function. In the case of Orchard, the "getter" should be a [Promise](https://github.com/promises-aplus/promises-spec)-returning function. Failure to provide a "getter" function will cause Orchard to immediately throw a `TypeError`.


### Getting & setting data

**Minimalist case**

In this case, an explicit cache key is used and a simple function returns a Promise for a string.

```
var cache = new Orchard('redis://localhost');
var Promise = require('bluebird');

var data = cache('jaeger', function () {
    return Promise.resolve('echo saber');
};

data.then(function (cacheValue) {
    console.log('cacheValue =>', cacheValue); 
});
```


**Intermediate case**

Rather than a string key, Orchard also accepts a key configuration object. The key configuration object must contain a `key` property and, optionally, an `expires` parameter and/or a `forceUpdate` parameter. `expires` is an `Number` representing seconds the cached data should live; `expires` overrides the `defaultExpires` set when Orchard was instantiated. `forceUpdate` causes Orchard to execute the "getter" function regardless of what is currently in the cache and sets the data for future use, overriding any pre-existing data for that key; `forceUpdate` defaults to `false`.

```
var cache = new Orchard('redis://localhost');
var Promise = require('bluebird');

var data = cache({
    key: 'jaeger:mark iv',
    expires: 3600,
    forceUpdate: false
}, function () {
    return Promise.resolve('echo saber');
};
```

**Complex case**

The `key` property of the key configuration object can also be an `Array` of `String`s, `Number`s, and Promises. Each element of the key array is resolved, then concatenated using `:` as a delimiter (e.g. `jaeger:iv:7`). Note that if `keyPrefix` was provided during instantiation, it is similarly added to the key string (`app-cache:jaeger:iv:7`). In addition, as with `defaultExpires` described earlier, key-level `expires` can be a duration object containing one or more of `days`, `hours`, `minutes`, and `seconds` parameters.

```
var cache = new Orchard('redis://localhost');
var Promise = require('bluebird');
var today = new Date();

var data = cache({
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


## Contribute

PRs are welcome! For bugs, please include a failing test which passes when your PR is applied.


## Orchard?

...
