# Locitree

Locitree is a small TypeScript DSL for defining locations as a type-safe tree.
Compose static and dynamic segments once, navigate the resulting structure
through an inferred API, and convert any node to its resolved location with
`toString()`.

Locitree only builds strings. It does not access the filesystem, create
directories, or check whether a location exists.
