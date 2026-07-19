export const ExtensionRegistry: Record<string, string> = {
  // JavaScript / TypeScript
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript React',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript React',
  '.cjs': 'JavaScript',
  '.mjs': 'JavaScript',
  
  // Python
  '.py': 'Python',
  
  // Go
  '.go': 'Go',
  
  // Rust
  '.rs': 'Rust',
  
  // Java
  '.java': 'Java',
  
  // C / C++
  '.c': 'C',
  '.cpp': 'C++',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  
  // Web / Markup / Data
  '.html': 'HTML',
  '.css': 'CSS',
  '.json': 'JSON',
  '.md': 'Markdown',
};

/**
 * Returns the language name for a given extension, or 'Unknown' if not supported.
 */
export function getLanguageForExtension(extension: string): string {
  return ExtensionRegistry[extension.toLowerCase()] || 'Unknown';
}

/**
 * Returns true if the extension is explicitly supported for metadata indexing.
 */
export function isSupportedExtension(extension: string): boolean {
  return extension.toLowerCase() in ExtensionRegistry;
}
