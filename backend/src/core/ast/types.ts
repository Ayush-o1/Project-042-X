import { FileModel } from '../scanner/types';

export interface GraphNode {
  id: string; // Absolute path
  fileMetadata: FileModel;
  hasSyntaxError?: boolean;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  isDynamic: boolean;
  isTypeOnly: boolean;
}

export interface ParsedDependencies {
  imports: Array<{
    specifier: string;
    isDynamic: boolean;
    isTypeOnly: boolean;
  }>;
  exports: Array<{
    specifier: string;
    isTypeOnly: boolean;
  }>;
}

export interface IParser {
  parse(filePath: string, content: string): Promise<ParsedDependencies>;
}
