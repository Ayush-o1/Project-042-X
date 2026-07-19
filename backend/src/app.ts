import express from 'express';
import cors from 'express';
import healthRoutes from './api/routes/health.routes';
import repositoryRoutes from './api/routes/repository.routes';
import { errorHandler } from './api/middlewares/errorHandler';

export const app = express();

app.use(express.json());
// Assuming cors is used properly, but Phase 1 server might just have app.use(cors())
// Let's ensure basic JSON middleware is here.
app.use(require('cors')());

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/repository', repositoryRoutes);

// Global Error Handler should be the last middleware
app.use(errorHandler);
