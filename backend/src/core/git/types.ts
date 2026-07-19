export interface GitCommitNode {
  hash: string;
  parents: string[]; // SHA-1 hashes of parent commits
  authorName: string;
  authorEmail: string;
  date: Date;
  message: string;
  refs: string[]; // Branches, tags, HEAD
  filesChanged: string[];
}

export interface GitGraph {
  commits: Map<string, GitCommitNode>;
  head: string | null;
}
