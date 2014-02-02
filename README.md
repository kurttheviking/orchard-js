<a href="http://promisesaplus.com/">
    <img src="http://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.0 compliant" align="right" />
</a>

orchard
=======

Read-through caching via [bluebird](https://github.com/petkaantonov/bluebird) and [redis](https://github.com/antirez/redis)


## Motivation


## Usage


## Configuration

### Instantiating a new Orchard

Instantiate an Orchard instance by passing a valid redis connection URI and, optionally, an `options` object. For example:

```
var cache = new Orchard('redis://authcode@192.168.1.1:6379/1')
```

or

```
var cache = new Orchard('redis://authcode@192.168.1.1:6379/1', {
	keyPrefix: 'main-cache',
	defaultExpires: 1
})
```


### Redis URI connection scheme

The URI connection scheme expects the following parameters:

- `redis://`: Required. A protocol prefix to indentifying this as URI connection format.
- `auth@`: Optional. If specified, [AUTH password](http://redis.io/commands/AUTH) used to connect to the redis database.
- `host`: Required. A network location (e.g. hostname or IP address) of the redis server.
- `:port`: Optional. The server port assigned to the redis process. Defaults to `6379`.
- `/database`: Optional. An available redis database number. Defaults to `0`.


### The `options` object

- `keyPrefix`: A string that is preprended to any subsequently cached key. Useful if a single redis database supports caching for multiple services.
- `defaultExpires`: By default, cached data never expires. This option makes it possible to set a default [TTL](http://redis.io/commands/ttl) for all cached keys. Key-level expiration, if provided, always supercedes the default. The value provided to this option can either be an `int` represening the number of seconds a key should live, or a duration object. Duration objects accept 1 or more valid parameters (`days`, `hours`, `minutes`, and/or `seconds`), for example:
	```
	{
		days: 14,
		hours: 2,
	}
	```

## API


## Contribute

PRs are welcome! For bugs, please include a failing test which passes when your PR is applied.


## Orchard?

...
