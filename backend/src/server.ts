import { app } from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 5001;
// Bind to loopback only: this server reads local files and must not be
// reachable from the network. Override with HOST at your own risk.
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`[Server] Project 042-X Backend listening on http://${HOST}:${PORT}`);
});
