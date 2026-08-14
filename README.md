# Locitree

[![CI](https://github.com/bigslycat/locitree/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/bigslycat/locitree/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/bigslycat/locitree/graph/badge.svg)](https://app.codecov.io/gh/bigslycat/locitree)

Locitree is a small TypeScript DSL for describing related locations as an
inferred, type-safe tree. It is useful when filesystem paths, object keys,
routes, or namespaced identifiers are assembled in many places and should have
one discoverable API instead of repeated string concatenation.

Locitree only builds strings. It does not access the filesystem, create
directories, or check whether a location exists.

## Install

```sh
npm install locitree
```

## Filesystem paths

Import `defineLocation` from `locitree/node` to join segments with Node.js
`path.join`. This gives paths the separators and normalization rules of the
current platform.

Filesystem results below use POSIX separators (`/`). On Windows, `path.join`
uses platform-native separators.

```ts
import { mkdir, readFile } from 'node:fs/promises'
import { defineLocation } from 'locitree/node'

const locations = defineLocation(process.cwd(), (inRoot) => ({
  source: inRoot('src', (inSource) => ({
    entry: inSource('index.ts'),
    features: inSource('features', (inFeatures) => ({
      byName: (name) => inFeatures(name),
    })),
  })),
  output: inRoot('dist'),
}))

await readFile(locations.source.entry.toString(), 'utf8')
await mkdir(locations.output.toString(), { recursive: true })

const billingDirectory = locations.source.features.byName('billing').toString()
```

The callback receives a factory for locations under the current node. Naming it
after that context (`inRoot`, `inSource`, and so on) makes every segment
relative to the right parent. Static properties are created immediately;
functions such as `byName` create dynamic locations when called.

## Builder arguments

A location builder may accept any number of arguments. Unannotated arguments are
contextually typed as `string`; explicit annotations are preserved in the
inferred tree API.

```ts
import { defineLocation } from 'locitree/node'

const locations = defineLocation('data', (inData) => ({
  reports: inData('reports', (inReports) => ({
    // year and month are both inferred as string
    monthly: (year, month) => inReports(`${year}-${month}.csv`),
  })),
  snapshots: inData('snapshots', (inSnapshots) => ({
    // Explicit types can model the values accepted by this location.
    at: (createdAt: Date, shard: number) =>
      inSnapshots(`${createdAt.toISOString().slice(0, 10)}-${shard}.json`),
  })),
}))

// data/reports/2026-08.csv
locations.reports.monthly('2026', '08').toString()

// data/snapshots/2026-08-14-3.json
locations.snapshots.at(new Date('2026-08-14'), 3).toString()
```

Both builders above take multiple arguments. TypeScript rejects a number passed
as `year`, or a string passed where `at` expects a `Date` or `number`.

The relative `inLocation` factory itself accepts a string segment and,
optionally, another child-definition callback. Put domain arguments on a named
builder, then turn them into a segment with `inLocation`, as `monthly` and `at`
do above.

## Other location formats

The core `withJoin` export applies the same tree API to any string hierarchy.
For example, telemetry names can use dots instead of filesystem separators:

```ts
import { withJoin } from 'locitree'

const defineMetric = withJoin((...parts) => parts.join('.'))

const metrics = defineMetric('checkout', (inCheckout) => ({
  payment: inCheckout('payment', (inPayment) => ({
    failed: inPayment('failed'),
  })),
}))

metrics.payment.failed.toString() // checkout.payment.failed
```

The same approach works for URL paths, object-storage keys, cache keys, and
other values whose segments have a consistent joining rule.

## Segment safety

Locitree does not validate or escape segments. Validate untrusted input before
passing it to a builder: `..` can escape a filesystem root, separators may
change the hierarchy, and URL segments are not encoded automatically.

## API

### `defineLocation(rootPath, defineChildren?)`

Available from `locitree/node`. Creates a root filesystem location and joins
nested segments with `node:path.join`. The returned root is also a location
node, so its `toString()` returns `rootPath`.

### `withJoin(join)`

Available from `locitree`. Creates a location factory using the supplied string
joining function. The returned factory has the same signature as
`defineLocation`.

### Location nodes

Every location node:

- exposes the child nodes and builders returned by its definition callback;
- returns its fully resolved string from `toString()`;
- is shallowly frozen, so its own properties cannot be added, removed, or
  reassigned.

The definition callback runs when its node is created. `toString` is reserved
for the node method.

Locitree performs no I/O. Pass `node.toString()` to filesystem, network, or SDK
APIs that consume the resolved location.

## Compatibility

- Node.js `^14.18.0` or `>=16.0.0`.
- ESM and CommonJS builds are included.
- `locitree` uses no Node.js APIs; `locitree/node` uses `node:path` and is
  Node.js-only.
- TypeScript is optional. JavaScript has the same runtime API without inferred
  type safety.

## Project

- [Repository](https://github.com/bigslycat/locitree)
- [Issues](https://github.com/bigslycat/locitree/issues)
- [MIT License](./LICENSE)
