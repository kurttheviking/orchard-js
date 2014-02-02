<a href="http://promisesaplus.com/">
    <img src="http://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.0 compliant" align="right" />
</a>

orchard
=======

Application-controlled, Promises/A+, read-through caching via [bluebird](https://github.com/petkaantonov/bluebird) and [redis](https://github.com/antirez/redis)


## Motivation


## Usage


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

**Valid `options` parameters**

- `keyPrefix`: A string that is preprended to any subseuqently used key. Useful if a single redis database supports caching for multiple services.
- `defaultExpires`: By default, cached data never expires. Use this option to set a default [TTL](http://redis.io/commands/ttl) for all cached keys. (Key-level expiration always supercedes this default.) The value can be either an `int` represening the number of seconds a key should live, or a duration object. Duration objects should contain one or more of `days`, `hours`, `minutes`, and `seconds` parameters:

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


## Contribute

PRs are welcome! For bugs, please include a failing test which passes when your PR is applied.


## Orchard?

...
