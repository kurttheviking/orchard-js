orchard [![Build Status](https://travis-ci.org/kurttheviking/orchard-js.svg?branch=master)](https://travis-ci.org/kurttheviking/orchard-js) [![Coverage Status](https://coveralls.io/repos/github/kurttheviking/orchard-js/badge.svg?branch=master)](https://coveralls.io/github/kurttheviking/orchard-js?branch=master)
=======

Read-through, fail-through, Redis-backed caching


## Getting started

### Prerequisites

- Node.js 4.x (LTS) or newer
- Redis 2.8 or newer

For local development, consider [Docker](https://www.docker.com/) for managing your Redis installation. First install the image:

```sh
docker run -d --name redis -p 6379:6379 redis:2.8
```

Then, run the image:

```sh
docker start redis
```

### Install

Install with [npm](https://www.npmjs.com):

```sh
npm install --save orchard
```

### Use

```js
const Orchard = require('orchard');

const orchard = new Orchard();

orchard(key, () => value).then(console.log);
```


## API

### `Orchard([options])`

This module exports a constructor. Instantiate an Orchard cache with desired `options`:

```js
const Orchard = require('orchard');

const options = {...};

const orchard = new Orchard(options);
```

#### Options

| Option | Type | Description | Default |
| :----- | :--- | :---------- | :------ |
| `herdCacheParams` | `Object` | Parameters passed to the internal, [in-memory LRU cache](https://www.npmjs.com/package/lru-cache) | `{ max: 1024, maxAge: 60000 }` |
| `keyHash` | `Function` | Hashing function applied to resolved keys (prior to prefixing) | *None* |
| `prefix` | `String` | Prepended to resolved cache keys; use if a single database supports multiple caching services | *None* |
| `scanCount` | `Number` | Hints Redis' `SCAN` command during keyspace enumeration (e.g. with delete) | `10` |
| `ttl` | `String` or `Number` | Sets expiration for a cached value, a `Number` is treated as milliseconds and a `String` is treated as an [`ms` duration](https://www.npmjs.com/package/ms) | *None* |
| `url` | `String` | Redis URI with required authentication | `redis://localhost:6379` |

Notes:

- `herdCacheParams`: To mitigate [thundering herd risks](https://en.wikipedia.org/wiki/Thundering_herd_problem), Orchard holds a `key` in memory while initially resolving the priming value; subsequent calls using the same `key` (within the same process) receive the same `Promise` until the value is resolved. This temporary cache is pruned to avoid unnecessary memory consumption.
- `keyHash`: This function is invoked with the resolved key and should resolve to (or return) a [deterministically hashed digest](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm) of the input. By providing a hashing function at instantiation, applications can avoid hashing sensitive keys at every Orchard call-site.
- `ttl`: Redis uses [seconds for expiration timers](https://redis.io/commands/expire); Orchard converts `ttl` from milliseconds to seconds, rounding down.

### `orchard(key, primingFunction[, options])`

Retrieve data from the Orchard cache, invoking the priming function to prime the cache.

```js
const Orchard = requirefastr'orchard');

const orchard = new Orchard(options);

orchard(key, () => Promise.resolve(value)).then(console.log);
```

Returns a `Promise` that resolves to the final value of the `primingFunction`. Internally, Orchard attempts to get the current value of `key` from the database. If the key does not exist or the database is not available, the `primingFunction` is invoked with the resolved `key` (including any `prefix`) and the final value is set in the database for future use.

`key` can be any one of:

- a `String`
- a `Promise` that resolves to a `String`
- a `Function` that returns a `String`
- a `Function` that returns a `Promise` that resolves to a `String`

`primingFunction` can be any one of:

- a `Function` that returns a [JSON-stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)-able `Object`
- a `Function` that returns a `Promise` that resolves to a [JSON-stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)-able `Object`

The `Promise` is rejected if there is an error resolving the `primingFunction`. Rejected cache calls are not persisted.

**Warning:** The `key` resolution process does not have the same stampede protections as the priming function. Instead, if `key` is a `Function`, it is invoked on every cache call. If you plan to remotely resolve the key you may want to consider caching the `key` function as well.

#### Options

| Option | Type | Description | Default |
| :----- | :--- | :---------- | :------ |
| `force` | `Boolean` | If `true`, ignore current cached value and overwrite with new value | `false` |

### `cache#del(key)`

Immediately delete one or more keys and associated data from the Orchard cache.

```js
const Orchard = require('orchard');

const orchard = new Orchard(options);

orchard.del(key).then(console.log);
```

Returns a `Promise` that resolves to the number of removed keys. If the last character of the resolved `key` is an asterisk (`*` &ndash; e.g. `items:*`), the key is treated as a pattern to use with Redis' [`SCAN` and `MATCH` commands](https://redis.io/commands/scan).

### `cache#on(eventName, eventListener)`

Listen to events emitted by Orchard.

```js
cache.on('cache:hit', console.log);
```

The cache instance is also an [event emitter](http://nodejs.org/api/events.html#events_class_events_eventemitter). `eventName` is a `String` corresponding to a supported event and `eventListener` is a callback function invoked each time the event is triggered.

#### `cache:hit`

```js
{
  requestId: <String:UUID>,
  key: <String>,
  ms: <Number:Integer:Milliseconds>
}
```

`ms` is milliseconds elapsed between invocation and resolution of the cached value.

#### `cache:miss`

```js
{
  requestId: <String:UUID>,
  key: <String>,
  ms: <Number:Integer:Milliseconds>
}
```

`ms` is milliseconds elapsed between invocation and resolution of the priming value *before* writing to the database.

#### `redis:error`

```js
<Error>{
  code: <String>,
  errno: <String>,
  syscall: <String>
}
```

#### `redis:ready`

*No event data*


## Development

### Tests

To run the full test suite, including unit tests and linting:

```sh
npm test
```

To run the only the unit test suite:

```sh
npm run test-unit
```

This project maintains 100% coverage of statements, branches, and functions. To determine unit test coverage:

```sh
npm run coverage
```

To run the integrated test suit against a live Redis database (`redis://localhost:6379`):

```sh
npm run test-integrated
```

**Warning:** The integrated test suite deletes all keys prefixed with `__ORCHARD_INTEGRATED_TEST`.

### Debug

This module is instrumented with [debug](https://www.npmjs.com/package/debug) to provide information about behavior during development. All debug invocations use the `orchard` prefix for targeted debug output:

```js
DEBUG=orchard* npm test
```

### Contribute

PRs are welcome! PRs must pass unit tests and linting prior to merge. For bugs, please include a failing test which passes when your PR is applied. To enable a git hook that runs `npm test` prior to pushing, `cd` into your repo and run:

```sh
touch .git/hooks/pre-push
chmod +x .git/hooks/pre-push
echo "npm test" > .git/hooks/pre-push
```

### Versioning

This project follows [semantic versioning](http://semver.org/). See the [change log](CHANGELOG.md) for release information.

### License

- This module is licensed under the [MIT License](./LICENSE)
- Redis is licensed under the ["Three Clause" BSD License](https://redis.io/topics/license)
