import { describe, it, expect } from 'vitest';
import { SwcParser } from '../SwcParser';

describe('SwcParser', () => {
  const parser = new SwcParser();

  it('should parse standard named and default imports', async () => {
    const code = `
      import React, { useState } from 'react';
      import { util } from './utils';
    `;
    const deps = await parser.parse('test.ts', code);
    
    expect(deps.imports.length).toBe(2);
    expect(deps.imports.map(i => i.specifier)).toContain('react');
    expect(deps.imports.map(i => i.specifier)).toContain('./utils');
  });

  it('should parse type imports', async () => {
    const code = `
      import type { MyType } from './types';
      import { type OtherType } from './other';
    `;
    const deps = await parser.parse('test.ts', code);
    
    expect(deps.imports.length).toBe(2);
    expect(deps.imports.find(i => i.specifier === './types')?.isTypeOnly).toBe(true);
    // Note: SWC parses `import { type X }` as a standard import declaration.
  });

  it('should parse dynamic imports', async () => {
    const code = `
      async function load() {
        const mod = await import('./dynamic-module');
      }
    `;
    const deps = await parser.parse('test.ts', code);
    
    expect(deps.imports.length).toBe(1);
    expect(deps.imports[0].specifier).toBe('./dynamic-module');
    expect(deps.imports[0].isDynamic).toBe(true);
  });

  it('should parse barrel exports (re-exports)', async () => {
    const code = `
      export { something } from './module-a';
      export * from './module-b';
    `;
    const deps = await parser.parse('test.ts', code);
    
    expect(deps.exports.length).toBe(2);
    expect(deps.exports.map(e => e.specifier)).toContain('./module-a');
    expect(deps.exports.map(e => e.specifier)).toContain('./module-b');
    
    // A re-export implies an import
    expect(deps.imports.map(i => i.specifier)).toContain('./module-a');
    expect(deps.imports.map(i => i.specifier)).toContain('./module-b');
  });
});
