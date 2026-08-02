// Ambient type declarations for untyped CommonJS packages consumed directly
// (not just re-exported) by dagreCjsShim.ts / dagreCjsShim.lodash.ts. Kept
// deliberately minimal (`unknown`, not real signatures) — these values are
// only ever passed through opaquely into dagre's own internals, never
// type-checked against real usage in this codebase, so a full `@types/*`
// dependency isn't warranted just for this.

declare module 'lodash/*' {
  const value: unknown;
  export default value;
}

declare module 'graphlib' {
  const graphlib: unknown;
  export default graphlib;
}
