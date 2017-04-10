## 2.2.0 (Apr 10, 2017)

- [minor] Add support for key hashing function (`#keyHash`)

## 2.1.0 (Apr 2, 2017)

- [minor] Add support for invocation-level option: force (ignores current value
  )

## 2.0.0 (Apr 1, 2017)

- [breaking] Removed key-level cache options
- [breaking] Removed ability to disable fail-through
- [breaking] Switched to native `Promise` instead of [bluebird](https://www.npmjs.com/package/bluebird)
- [breaking] Switched to ES6 syntax (Node.js 4+ now required)
- [patch] Upgraded dependencies
- [patch] Reorganized test suite


## 1.0.0 (Feb 22, 2016)

- [breaking] Moved key-level options to third argument of the cache call
- [breaking] `#prune` (`#evict`) and `#prunePattern` (`#evictPattern`) consolidated into `#del`
- [breaking] Renamed instance and key-level arguments (e.g. `keyPrefix` &rarr; `prefix`, `expires` &rarr; `ttl`)
- [minor] Generalized key and priming values to any primitive, Promise, or Function
- [patch] Addressed thundering herd risk
- [patch] Upgraded dependencies
- [patch] Reorganized and expanded test suite
