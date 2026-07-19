import simpleGit, { SimpleGit } from 'simple-git';
import { GitCommitNode, GitGraph } from './types';
import { GitRepositoryError, EmptyGitRepositoryError } from '../errors/GitErrors';

const DELIMITER = '@@__042X__@@';
// Format: Hash, ParentHashes, AuthorName, AuthorEmail, DateIso, Subject, Refs
const LOG_FORMAT = `%H${DELIMITER}%P${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%aI${DELIMITER}%s${DELIMITER}%D`;

export class GitIntelligenceEngine {
  /**
   * Scans a local Git repository and constructs an in-memory topological graph.
   * @param repoPath Absolute path to the local repository.
   * @param maxCount Optional limit on the number of commits to retrieve (for extremely large repos).
   */
  public async analyze(repoPath: string, maxCount?: number): Promise<GitGraph> {
    const git: SimpleGit = simpleGit(repoPath);

    await this.verifyRepository(git, repoPath);

    const logArgs = ['--all', `--format=${LOG_FORMAT}`];
    if (maxCount) {
      logArgs.push(`--max-count=${maxCount}`);
    }

    let rawLog: string;
    try {
      rawLog = await git.raw(['log', ...logArgs]);
    } catch (e: any) {
      if (e.message.includes('does not have any commits yet')) {
        throw new EmptyGitRepositoryError(repoPath);
      }
      throw new GitRepositoryError(repoPath, `Failed to run git log: ${e.message}`);
    }

    if (!rawLog || rawLog.trim() === '') {
      throw new EmptyGitRepositoryError(repoPath);
    }

    const commits = new Map<string, GitCommitNode>();
    let headHash: string | null = null;

    const lines = rawLog.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      const parts = line.split(DELIMITER);
      if (parts.length !== 7) continue;

      const [hash, parentsRaw, authorName, authorEmail, dateIso, message, refsRaw] = parts;

      const parents = parentsRaw ? parentsRaw.split(' ').filter(p => p.length > 0) : [];
      const refs = refsRaw ? refsRaw.split(', ').filter(r => r.length > 0) : [];

      // Check if this commit is the current HEAD
      if (refs.includes('HEAD') || refs.some(r => r.startsWith('HEAD ->'))) {
        headHash = hash;
      }

      commits.set(hash, {
        hash,
        parents,
        authorName,
        authorEmail,
        date: new Date(dateIso),
        message,
        refs,
      });
    }

    return {
      commits,
      head: headHash,
    };
  }

  private async verifyRepository(git: SimpleGit, repoPath: string): Promise<void> {
    try {
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new GitRepositoryError(repoPath, 'Not a valid Git repository.');
      }
    } catch (e: any) {
      throw new GitRepositoryError(repoPath, `Validation failed: ${e.message}`);
    }
  }
}
