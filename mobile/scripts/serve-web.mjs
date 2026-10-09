import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 8081);
const host = '0.0.0.0';
const apiHost = process.env.API_HOST || '127.0.0.1';
const apiPort = Number(process.env.API_PORT || 8000);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const candidates = [
    path.join(dist, clean),
    path.join(dist, clean + '.html'),
    path.join(dist, clean, 'index.html'),
  ];
  if (clean === '/' || clean === '') {
    candidates.unshift(path.join(dist, 'index.html'));
  }
  if (!path.extname(clean)) {
    candidates.push(path.join(dist, clean.replace(/^\//, '') + '.html'));
  }
  for (const file of candidates) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return path.join(dist, 'index.html');
}

function proxyApi(req, res) {
  const headers = { ...req.headers, host: `${apiHost}:${apiPort}` };
  delete headers['accept-encoding'];
  const upstream = http.request(
    {
      hostname: apiHost,
      port: apiPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (pres) => {
      res.writeHead(pres.statusCode || 502, {
        'content-type': pres.headers['content-type'] || 'application/json',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      });
      pres.pipe(res);
    },
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'api_proxy_failed', detail: String(err.message) }));
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': '*',
    });
    res.end();
    return;
  }

  const file = resolveFile(url);
  const ext = path.extname(file);
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file)
    .on('error', () => {
      res.writeHead(404);
      res.end('Not found');
    })
    .pipe(res);
});

server.listen(port, host, () => {
  console.log(`Oracle Sports static web on http://${host}:${port}`);
  console.log(`API proxy: /api/* → http://${apiHost}:${apiPort}`);
  console.log(`Open /hello.html (litmus), then /debug.html, then /football`);
});
