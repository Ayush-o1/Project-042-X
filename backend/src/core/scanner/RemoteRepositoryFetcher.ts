import simpleGit from 'simple-git';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  InvalidRepositoryUrlError,
  RepositoryCloneTimeoutError,
  RepositoryTooLargeError,
} from '../errors/RepositoryErrors';

/** Only plain GitHub HTTPS repository URLs — no query strings, credentials,
 *  subpaths, or other hosts. Deliberately narrow: this string is handed
 *  straight to `git clone`, so anything it accepts is something a public
 *  demo deployment will shell out to fetch. */
const GITHUB_URL_RE = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

const CLONE_DIR_PREFIX = '042x-clone-';
const CLONE_DEPTH = Number(process.env.CLONE_DEPTH) || 500;
const CLONE_TIMEOUT_MS = Number(process.env.CLONE_TIMEOUT_MS) || 45_000;
const MAX_CLONE_SIZE_BYTES = (Number(process.env.MAX_CLONE_SIZE_MB) || 300) * 1024 * 1024;
/** Clone directories older than this are swept opportunistically before
 *  each new clone — a safety net for orphans left by a crashed process,
 *  without needing a background timer running on a free-tier dyno. */
const ORPHAN_TTL_MS = 2 * 60 * 60 * 1000;

export function isGitHubRepoUrl(input: string): boolean {
  return GITHUB_URL_RE.test(input.trim());
}

/** Normalizes a GitHub URL to the exact form passed to `git clone` — strips
 *  a trailing `.git`/slash so `owner/repo`, `owner/repo/`, and
 *  `owner/repo.git` all resolve to the same clone target. */
export function normalizeGitHubUrl(input: string): string {
  const match = GITHUB_URL_RE.exec(input.trim());
  if (!match) throw new InvalidRepositoryUrlError(input);
  const [, owner, repo] = match;
  return `https://github.com/${owner}/${repo}.git`;
}

async function sweepOrphanClones(): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(os.tmpdir());
  } catch {
    return;
  }
  const now = Date.now();
  await Promise.all(
    entries
      .filter(name => name.startsWith(CLONE_DIR_PREFIX))
      .map(async name => {
        const dir = path.join(os.tmpdir(), name);
        try {
          const stat = await fs.stat(dir);
          if (now - stat.mtimeMs > ORPHAN_TTL_MS) {
            await fs.rm(dir, { recursive: true, force: true });
          }
        } catch {
          // Already gone, or a permissions race — either way, not our problem.
        }
      }),
  );
}

/** Sums directory size, aborting as soon as `limitBytes` is exceeded instead
 *  of walking a huge tree to completion just to reject it. */
async function exceedsSize(dir: string, limitBytes: number): Promise<boolean> {
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(full);
          total += stat.size;
        } catch {
          // File vanished mid-walk; ignore.
        }
      }
      if (total > limitBytes) return true;
    }
  }
  return false;
}

/**
 * Clones a public GitHub repository into a fresh temp directory for
 * analysis — the same shape `RepositoryIntelligenceEngine.analyze()`
 * already expects for a local path, so nothing downstream needs to know
 * the repository didn't start out on disk.
 *
 * Bounded on three axes so a public demo deployment can't be turned into a
 * denial-of-service vector: a shallow, single-branch clone (bounded history
 * and, for most repositories, bounded working-tree size), a hard wall-clock
 * timeout on the clone itself, and a post-clone disk size check that
 * rejects (and deletes) anything unexpectedly large before it ever reaches
 * the scanner/AST engine.
 */
export async function cloneRepositoryForAnalysis(url: string): Promise<string> {
  if (!isGitHubRepoUrl(url)) throw new InvalidRepositoryUrlError(url);
  const cloneUrl = normalizeGitHubUrl(url);

  await sweepOrphanClones();

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), CLONE_DIR_PREFIX));
  const git = simpleGit();

  const clonePromise = git.clone(cloneUrl, dir, [
    '--depth', String(CLONE_DEPTH),
    '--single-branch',
    '--no-tags',
  ]);
  // Promise.race abandons (doesn't cancel) the clone on timeout — simple-git
  // doesn't expose the underlying child process to kill outright. Deleting
  // `dir` immediately below means the still-running git process starts
  // failing its own writes shortly after, rather than continuing unbounded.
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new RepositoryCloneTimeoutError(url)), CLONE_TIMEOUT_MS);
  });

  try {
    await Promise.race([clonePromise, timeoutPromise]);
  } catch (err) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    if (err instanceof RepositoryCloneTimeoutError) throw err;
    throw new InvalidRepositoryUrlError(url);
  }

  if (await exceedsSize(dir, MAX_CLONE_SIZE_BYTES)) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    throw new RepositoryTooLargeError(url, MAX_CLONE_SIZE_BYTES);
  }

  return dir;
}

/** Best-effort cleanup — called once an analysis using a cloned directory
 *  is evicted from the in-memory cache, or before a new clone as an orphan
 *  sweep. Never throws: cleanup failing is not worth surfacing to a user
 *  whose request already completed successfully. */
export async function cleanupClonedRepository(dir: string): Promise<void> {
  if (!path.basename(dir).startsWith(CLONE_DIR_PREFIX)) return; // never rm a non-clone path
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

export const __testing = { CLONE_DIR_PREFIX, MAX_CLONE_SIZE_BYTES, CLONE_DEPTH };
