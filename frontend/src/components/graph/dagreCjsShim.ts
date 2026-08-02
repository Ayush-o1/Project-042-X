/**
 * dagre (and its dependency, graphlib) ship as legacy CommonJS packages.
 * Three of their internal files — dagre/lib/lodash.js, dagre/lib/graphlib.js,
 * and graphlib/lib/lodash.js — contain an ambient-environment-detection
 * pattern along the lines of:
 *
 *   if (typeof require === "function") {
 *     try { x = require("some-module"); } catch (e) {}
 *   }
 *   if (!x) { x = window.someGlobal; }
 *
 * That's written for either a real Node/CommonJS `require`, or a
 * <script>-tag-provided browser global (the old "just drop lodash.js on the
 * page" convention) — it assumes one of the two always exists. Neither does
 * in a Vite-bundled Web Worker: there's no CommonJS `require`, and Worker
 * global scope has no `window` at all (not even `undefined` — the bare
 * identifier itself is undeclared). The `require()` branch is what actually
 * ships correctly today in dev (Vite's esbuild dependency pre-bundling
 * resolves it ahead of time), but production's Rollup/Rolldown build of the
 * worker chunk does not reliably do the same, so at runtime `typeof require`
 * evaluates to `"undefined"`, the code falls through to the second branch,
 * and referencing the bare `window` identifier throws
 * `ReferenceError: window is not defined` the instant dagre.layout() first
 * needs one of these — which is what surfaced in production.
 *
 * Rather than fight that bundler-specific gap (which would mean re-verifying
 * this on every Vite/Rolldown upgrade), this provides a real, synchronous
 * `require()` on the worker's global scope for exactly the specifiers these
 * three files ask for, so their own intended code path runs — the one that
 * resolves real functions — instead of ever reaching the window fallback.
 * `globalThis` (not `window`/`self`) is used because it resolves correctly
 * in a Worker's global scope, a normal window context, and Node (this
 * file's own unit tests run under Vitest's Node environment, where `self`
 * doesn't exist at all) — in a real browser/Worker, `globalThis` and `self`
 * are the same object, so this doesn't change the fix's behavior there.
 *
 * Import this before `dagre` anywhere in this module graph — ES module
 * import ordering guarantees a module's own top-level code (here, the
 * `globalScope.require = ...` assignment two files down) finishes running
 * before a later `import dagre from 'dagre'` in the same or a downstream
 * module begins evaluating.
 */
import './dagreCjsShim.lodash';
import graphlib from 'graphlib';
import type { RequireShim } from './dagreCjsShim.lodash';

const globalScope = globalThis as unknown as { require: RequireShim };

const previous = globalScope.require;
globalScope.require = (id: string) => {
  if (id === 'graphlib') return graphlib;
  return previous(id);
};
