import express from 'express';
import cors from 'cors';
import healthRoutes from './api/routes/health.routes';
import repositoryRoutes from './api/routes/repository.routes';
import { errorHandler } from './api/middlewares/errorHandler';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/repository', repositoryRoutes);

// Global Error Handler should be the last middleware
app.use(errorHandler);
