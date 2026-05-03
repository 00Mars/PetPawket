// scripts/site-gateway.js
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const PORT = Number(process.env.GATEWAY_PORT || 8080);
const PET_TARGET = new URL(process.env.PETPAWKET_TARGET || 'http://localhost:3001');
const CHARM_TARGET = new URL(process.env.CHARM_TARGET || 'http://localhost:3011');

const charmHosts = (process.env.CHARM_HOSTS || 'thecharmfoundation.com,charmfoundation.com,charmfoundation.local')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const petHosts = (process.env.PETPAWKET_HOSTS || 'petpawket.com,localhost')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const charmPrefix = process.env.CHARM_PATH_PREFIX || '/charm';

function hostMatches(host, list) {
  return list.some(entry => host === entry || host.endsWith(`.${entry}`));
}

function pickTarget(req) {
  const hostHeader = String(req.headers.host || '').toLowerCase();
  const host = hostHeader.split(':')[0];
  const path = req.url || '/';

  if (host && hostMatches(host, charmHosts)) {
    return { target: CHARM_TARGET, stripPrefix: false };
  }

  if (host && hostMatches(host, petHosts)) {
    return { target: PET_TARGET, stripPrefix: false };
  }

  if (path.startsWith(charmPrefix)) {
    return { target: CHARM_TARGET, stripPrefix: true };
  }

  return { target: PET_TARGET, stripPrefix: false };
}

function proxy(req, res) {
  const { target, stripPrefix } = pickTarget(req);
  const upstream = new URL(req.url || '/', target);

  if (stripPrefix && upstream.pathname.startsWith(charmPrefix)) {
    upstream.pathname = upstream.pathname.replace(charmPrefix, '') || '/';
  }

  const client = upstream.protocol === 'https:' ? https : http;
  const proxyReq = client.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: upstream.pathname + upstream.search,
      headers: {
        ...req.headers,
        host: upstream.host
      }
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad gateway');
    console.error('[gateway] proxy error:', err.message || err);
  });

  req.pipe(proxyReq);
}

const server = http.createServer(proxy);

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  console.error('[gateway] client error:', err.message || err);
});

server.listen(PORT, () => {
  console.log(`[gateway] listening on http://localhost:${PORT}`);
  console.log(`[gateway] pet target -> ${PET_TARGET.href}`);
  console.log(`[gateway] charm target -> ${CHARM_TARGET.href}`);
});
