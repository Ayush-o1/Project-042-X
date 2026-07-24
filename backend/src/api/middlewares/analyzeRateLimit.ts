import rateLimit from 'express-rate-limit';

/**
 * Throttles the one endpoint that does real work — cloning a repository and
 * running the full AST/git analysis pipeline — so a public demo deployment
 * can't be turned into a free compute/bandwidth sink by scripted repeat
 * requests. Every other endpoint just serves already-computed data from
 * memory and doesn't need this.
 *
 * A no-op locally (default limit is generous enough that normal use never
 * hits it); tightened in practice by ANALYZE_RATE_LIMIT on a public
 * deployment.
 */
export const analyzeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ANALYZE_RATE_LIMIT) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many analysis requests. Please wait a few minutes and try again.',
    },
  },
});
