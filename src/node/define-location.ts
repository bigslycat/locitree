import { join } from 'node:path'

import { withJoin } from '../with-join'

/**
 * Defines a statically typed tree of filesystem locations.
 *
 * Nested segments are resolved with Node.js `path.join`, so path separators
 * and normalization follow the current platform. The optional callback returns
 * the child nodes and location builders exposed by the resulting node. Every
 * node is shallowly frozen and its `toString` method returns the resolved path.
 *
 * @param rootPath - The path represented by the root node.
 * @param defineChildren - An optional callback that defines locations relative
 * to the root node.
 * @returns A location node exposing the inferred child locations and builders.
 *
 * @example
 * ```ts
 * const src = defineLocation('src', (inSrc) => ({
 *   components: inSrc('components'),
 *   file: (name: string) => inSrc(name),
 * }))
 *
 * src.components.toString() // `src/components` on POSIX systems
 * src.file('index.ts').toString() // `src/index.ts` on POSIX systems
 * ```
 */
export const defineLocation = withJoin(join)
