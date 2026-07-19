import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', phase: 1 });
});

app.listen(PORT, () => {
  console.log(`Project 042-X Backend is running on http://localhost:${PORT}`);
});
