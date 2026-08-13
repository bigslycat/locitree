/**
 * Creates a location factory that resolves nested segments with the supplied
 * join function.
 *
 * Returned location objects are shallowly frozen, preventing their own
 * properties from being added, removed, or reassigned at runtime.
 *
 * @param join - Combines path fragments into a resolved location string.
 * @returns A location factory that uses the supplied join function.
 */
export function withJoin(join: (...paths: string[]) => string): LocationFactory {
  /**
   * Creates a location node for an already resolved root path.
   *
   * @typeParam Shape - The inferred contextual shape of the node.
   * @param rootPath - The fully resolved path represented by the node.
   * @param defineChildren - An optional callback that defines nested
   * locations relative to `rootPath`.
   * @returns A shallowly frozen location node with the inferred child shape.
   */
  function defineLocation<Shape extends AnyArgsLocationShape>(
    rootPath: string,
    defineChildren?: (inLocation: LocationFactory) => Shape,
  ): LocationNode<Shape> {
    /**
     * Creates locations relative to the current `rootPath`.
     */
    const inLocation = <NestedShape extends AnyArgsLocationShape>(
      segment: string,
      nestedSetup?: (inLocation: LocationFactory) => NestedShape,
    ) => defineLocation(join(rootPath, segment), nestedSetup)

    return Object.freeze({
      ...defineChildren?.(inLocation),
      toString: () => rootPath,
    }) as LocationNode<Shape>
  }

  return defineLocation
}

/**
 * Creates location nodes relative to the current location.
 *
 * Calling the factory with only a segment creates a leaf node. Supplying a
 * child-definition callback creates a node with a statically inferred
 * contextual shape.
 */
export interface LocationFactory {
  /**
   * Creates a leaf location by appending a segment to the current path.
   *
   * @param segment - The path segment to append.
   * @returns A location node representing the resolved path.
   */
  (segment: string): LocationNode

  /**
   * Creates a location whose unannotated child-builder parameters are
   * contextually typed as `string`.
   *
   * This overload must appear before the generic fallback overload so that
   * inline callbacks receive the default `string` contextual type.
   *
   * @typeParam Shape - The inferred child shape.
   * @param segment - The path segment to append.
   * @param defineChildren - A callback that defines children relative to the
   * newly created location.
   * @returns A location node exposing the inferred child shape.
   */
  <Shape extends ContextualLocationShape>(
    segment: string,
    defineChildren: (inLocation: LocationFactory) => Shape,
  ): LocationNode<Shape>

  /**
   * Creates a location whose child builders may use arbitrary explicitly
   * declared argument types.
   *
   * This overload acts as a fallback when a child builder is incompatible
   * with the default `string[]` parameter list.
   *
   * @typeParam Shape - The inferred child shape, including each builder's
   * explicit parameter types.
   * @param segment - The path segment to append.
   * @param defineChildren - A callback that defines children relative to the
   * newly created location.
   * @returns A location node exposing the inferred child shape.
   */
  <Shape extends AnyArgsLocationShape>(
    segment: string,
    defineChildren: (inLocation: LocationFactory) => Shape,
  ): LocationNode<Shape>
}

/**
 * Describes the children that may be attached to a location node.
 *
 * Each property may be either another location node or a function that builds
 * one. Unannotated builder parameters are contextually typed as `string` by
 * default, while an explicit `Args` tuple can provide a different signature.
 *
 * @typeParam Args - The argument tuple used to contextually type child builder
 * functions. Defaults to `string[]`.
 */
interface ContextualLocationShape<Args extends unknown[] = string[]> {
  /** A named child node or a factory that creates one from contextual arguments. */
  [key: string]:
    | LocationNode<void | AnyArgsLocationShape>
    | ((...args: Args) => LocationNode<void | AnyArgsLocationShape>)
}

/**
 * Constraint that accepts child builders with any explicitly declared
 * parameter list.
 *
 * `never[]` is used instead of `unknown[]` because function parameters are
 * checked contravariantly under `strictFunctionTypes`. A concrete signature,
 * such as `(date: Date, index: number) => LocationNode`, is assignable to a
 * rest parameter of `never[]`, but not to one of `unknown[]`.
 *
 * This type is used only as a constraint and does not replace the inferred
 * signatures in the resulting location shape.
 */
export type AnyArgsLocationShape = ContextualLocationShape<never[]>

/**
 * Represents a location node with an optional context-specific API.
 *
 * Without a shape, the node exposes only the base location API. When a shape
 * is provided, its child locations and location builders are included in the
 * resulting node type.
 *
 * @typeParam Shape - The context-specific API exposed by the location node.
 */
export type LocationNode<Shape extends void | AnyArgsLocationShape = void> = Shape extends void
  ? LocationNodeBase
  : Readonly<Omit<Shape, keyof LocationNodeBase>> & LocationNodeBase

/**
 * Common API shared by every location node.
 *
 * The unique-symbol property makes location nodes nominally distinct from
 * arbitrary objects that happen to expose a compatible `toString` method.
 */
export interface LocationNodeBase {
  /**
   * Returns the fully resolved path represented by this node.
   */
  readonly toString: () => string

  /**
   * Nominal type marker. It has no runtime representation in nodes created by withJoin.
   */
  readonly [brand]: 'LocationNode'
}

/**
 * Unique type-level key that distinguishes location nodes from structurally
 * similar objects.
 */
declare const brand: unique symbol
