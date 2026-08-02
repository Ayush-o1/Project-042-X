/**
 * See `dagreCjsShim.ts` for the full explanation. This half covers only the
 * `lodash/*` specifiers dagre and graphlib's internal shims ask for — split
 * into its own module (rather than one file) so ES module import ordering
 * guarantees it finishes registering these before `dagreCjsShim.ts` goes on
 * to import `graphlib`, which needs some of them available immediately.
 */
import clone from 'lodash/clone';
import cloneDeep from 'lodash/cloneDeep';
import constant from 'lodash/constant';
import defaults from 'lodash/defaults';
import each from 'lodash/each';
import filter from 'lodash/filter';
import find from 'lodash/find';
import flatten from 'lodash/flatten';
import forEach from 'lodash/forEach';
import forIn from 'lodash/forIn';
import has from 'lodash/has';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import isUndefined from 'lodash/isUndefined';
import keys from 'lodash/keys';
import last from 'lodash/last';
import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import max from 'lodash/max';
import merge from 'lodash/merge';
import min from 'lodash/min';
import minBy from 'lodash/minBy';
import now from 'lodash/now';
import pick from 'lodash/pick';
import range from 'lodash/range';
import reduce from 'lodash/reduce';
import size from 'lodash/size';
import sortBy from 'lodash/sortBy';
import transform from 'lodash/transform';
import union from 'lodash/union';
import uniqueId from 'lodash/uniqueId';
import values from 'lodash/values';
import zipObject from 'lodash/zipObject';

export type RequireShim = (id: string) => unknown;

// `globalThis` (not `self`/`window`) so this works identically in a Web
// Worker, the main thread, and Node — including this file's own unit tests,
// which run under Vitest's Node environment where `self` doesn't exist at
// all. In a real browser/Worker, `globalThis` and `self` are the same
// object, so this doesn't change the fix's behavior there.
const globalScope = globalThis as unknown as { require?: RequireShim };

const lodashModules: Record<string, unknown> = {
  'lodash/clone': clone,
  'lodash/cloneDeep': cloneDeep,
  'lodash/constant': constant,
  'lodash/defaults': defaults,
  'lodash/each': each,
  'lodash/filter': filter,
  'lodash/find': find,
  'lodash/flatten': flatten,
  'lodash/forEach': forEach,
  'lodash/forIn': forIn,
  'lodash/has': has,
  'lodash/isArray': isArray,
  'lodash/isEmpty': isEmpty,
  'lodash/isFunction': isFunction,
  'lodash/isUndefined': isUndefined,
  'lodash/keys': keys,
  'lodash/last': last,
  'lodash/map': map,
  'lodash/mapValues': mapValues,
  'lodash/max': max,
  'lodash/merge': merge,
  'lodash/min': min,
  'lodash/minBy': minBy,
  'lodash/now': now,
  'lodash/pick': pick,
  'lodash/range': range,
  'lodash/reduce': reduce,
  'lodash/size': size,
  'lodash/sortBy': sortBy,
  'lodash/transform': transform,
  'lodash/union': union,
  'lodash/uniqueId': uniqueId,
  'lodash/values': values,
  'lodash/zipObject': zipObject,
};

const previous = globalScope.require;
globalScope.require = (id: string) => {
  if (id in lodashModules) return lodashModules[id];
  if (previous) return previous(id);
  throw new Error(`dagreCjsShim: no shim registered for require("${id}")`);
};
