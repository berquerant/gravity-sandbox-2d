import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

/**
 * Handles incoming HTTP requests for static assets, enforcing directory traversal prevention.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} [root=process.cwd()]
 */
export function handleRequest(req, res, root = process.cwd()) {
  const safeUrl = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
  let pathname = decodeURIComponent(safeUrl.pathname);
  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  const filePath = path.normalize(path.join(root, pathname));

  // Security check: prevent directory traversal outside root
  const rawPath = decodeURIComponent(req.url.split('?')[0]);
  const relative = path.relative(root, filePath);
  if (rawPath.includes('/../') || rawPath.includes('/..\\') || rawPath.endsWith('/..') || relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    if (stats.isDirectory()) {
      res.writeHead(302, { Location: pathname + '/' });
      res.end();
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

/**
 * Creates a native Node.js static HTTP server instance.
 * @param {string} [root=process.cwd()]
 * @returns {import('node:http').Server}
 */
export function createStaticServer(root = process.cwd()) {
  return http.createServer((req, res) => handleRequest(req, res, root));
}

// Auto-run if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const PORT = parseInt(process.argv[2] || process.env.PORT || '8000', 10);
  const server = createStaticServer();

  server.listen(PORT, () => {
    console.log(`Server starting at: http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop');
  });

  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}
