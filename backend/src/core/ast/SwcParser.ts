import * as swc from '@swc/core';
import { IParser, ParsedDependencies } from './types';

export class SwcParser implements IParser {
  public async parse(filePath: string, content: string): Promise<ParsedDependencies> {
    const dependencies: ParsedDependencies = {
      imports: [],
      exports: []
    };

    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isTsxOrJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');

    try {
      const ast = await swc.parse(content, {
        syntax: isTypeScript ? 'typescript' : 'ecmascript',
        tsx: isTsxOrJsx,
        jsx: isTsxOrJsx,
        target: 'es2022',
        comments: false,
      });

      this.walk(ast, dependencies);
      return dependencies;
    } catch (e) {
      throw new Error(`SWC Parsing failed for ${filePath}: ${(e as Error).message}`);
    }
  }

  private walk(node: any, deps: ParsedDependencies): void {
    if (!node || typeof node !== 'object') return;

    // Handle imports: import x from 'y'; import { x } from 'y';
    if (node.type === 'ImportDeclaration') {
      deps.imports.push({
        specifier: node.source.value,
        isDynamic: false,
        isTypeOnly: node.typeOnly === true,
      });
    }

    // Handle TS import equals: import x = require('y');
    if (node.type === 'TsImportEqualsDeclaration' && node.moduleReference?.type === 'TsExternalModuleReference') {
      deps.imports.push({
        specifier: node.moduleReference.expression.value,
        isDynamic: false,
        isTypeOnly: node.isExport === false && node.isTypeOnly === true,
      });
    }

    // Handle exports: export { x } from 'y'; export * from 'y';
    if (node.type === 'ExportNamedDeclaration' && node.source) {
      deps.exports.push({
        specifier: node.source.value,
        isTypeOnly: node.typeOnly === true,
      });
      // A re-export is also an import under the hood
      deps.imports.push({
        specifier: node.source.value,
        isDynamic: false,
        isTypeOnly: node.typeOnly === true,
      });
    }

    if (node.type === 'ExportAllDeclaration') {
      deps.exports.push({
        specifier: node.source.value,
        isTypeOnly: false,
      });
      deps.imports.push({
        specifier: node.source.value,
        isDynamic: false,
        isTypeOnly: false,
      });
    }

    // Handle dynamic imports: await import('y')
    if (node.type === 'CallExpression' && node.callee?.type === 'Import') {
      if (node.arguments && node.arguments.length > 0) {
        const arg = node.arguments[0].expression;
        if (arg.type === 'StringLiteral') {
          deps.imports.push({
            specifier: arg.value,
            isDynamic: true,
            isTypeOnly: false,
          });
        }
      }
    }

    // Recursively walk children
    for (const key in node) {
      if (Array.isArray(node[key])) {
        for (const child of node[key]) {
          this.walk(child, deps);
        }
      } else if (typeof node[key] === 'object') {
        this.walk(node[key], deps);
      }
    }
  }
}
