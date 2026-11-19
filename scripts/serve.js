import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
const root = await realpath(process.cwd());
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!['/', '/index.html', '/favicon.svg'].includes(pathname) && !/^\/(src|assets)\//.test(pathname)) { res.writeHead(404).end('Not found'); return; }
    const file = await realpath(resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
const lan = process.argv.includes('--lan');
server.listen(Number(process.env.PORT || 4173), lan ? '0.0.0.0' : '127.0.0.1', () => {
  const port = server.address().port;
  console.log(`Marsito App → http://127.0.0.1:${port}`);
  if (lan) {
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses || []) {
        if (address.family === 'IPv4' && !address.internal) console.log(`Red local → http://${address.address}:${port}`);
      }
    }
    console.log('Solo para redes de confianza. Detén el servidor con Ctrl+C al terminar.');
  }
});
