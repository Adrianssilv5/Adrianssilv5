// Tiny static server so ES modules + importmap work in headless Chromium.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
export function serve(root) {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      try {
        const p = normalize(join(root, decodeURIComponent(req.url.split('?')[0])));
        if (!p.startsWith(root)) throw new Error('outside root');
        res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
        res.end(await readFile(p));
      } catch { res.writeHead(404); res.end(); }
    }).listen(0, '127.0.0.1', () => resolve({ port: srv.address().port, close: () => srv.close() }));
  });
}
export const CHROME_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
