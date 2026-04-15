import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Next.js
const next = (await import('next')).default;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

await app.prepare();
console.log('> Next.js app prepared');

const server = createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    handle(req, res, parsedUrl);
  } catch (err) {
    console.error('Request handling error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(3000, () => {
  console.log('> Server listening on http://localhost:3000');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('SIGINT received');
  server.close(() => process.exit(0));
});

// Catch errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// Keep alive
setInterval(() => {}, 60000);
console.log('> Server startup complete, PID:', process.pid);
