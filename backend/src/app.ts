import express from 'express';
import cors from 'cors';
import healthRoutes from './api/routes/health.routes';
import repositoryRoutes from './api/routes/repository.routes';
import { errorHandler } from './api/middlewares/errorHandler';
import { hostGuard } from './api/middlewares/hostGuard';

export const app = express();

// Render (and most PaaS hosts) sit behind a reverse proxy — without this,
// every request appears to come from the proxy's IP, which would make the
// analyze rate limit share one bucket across every visitor instead of
// limiting per-client. Only trusted in public mode; a local dev server has
// no proxy in front of it.
if (process.env.PUBLIC_DEMO_MODE === 'true') {
  app.set('trust proxy', 1);
}

// This API reads local files, so it must never be drivable by arbitrary websites.
// Only local dev/preview origins may read responses; ALLOWED_ORIGINS overrides.
const allowedOrigins: (string | RegExp)[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];

app.use(hostGuard);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/repository', repositoryRoutes);

// Global Error Handler should be the last middleware
app.use(errorHandler);
