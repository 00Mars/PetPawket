// apps/charmfoundation/server.js
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import casesRoutes from './routes/casesRoutes.js';
import partnersRoutes from './routes/partnersRoutes.js';
import volunteersRoutes from './routes/volunteersRoutes.js';
import donationsRoutes from './routes/donationsRoutes.js';
import eventsRoutes from './routes/eventsRoutes.js';
import commsRoutes from './routes/commsRoutes.js';
import { pingDb } from './db/pg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3011;
app.set('etag', false);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/favicon.ico', (_req, res) => {
  res.redirect(302, '/favicon.svg');
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (_req, res) => {
  const dbOk = await pingDb().catch(() => false);
  res.json({ ok: true, dbOk });
});

app.use('/api/cases', casesRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/volunteers', volunteersRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api', commsRoutes);

app.get('/cases/:id', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'case.html'));
});

const pages = {
  '/': 'index.html',
  '/get-help': 'get-help.html',
  '/volunteer': 'volunteer.html',
  '/cases': 'cases.html',
  '/impact': 'impact.html',
  '/partners': 'partners.html',
  '/events': 'events.html',
  '/donate': 'donate.html',
  '/about': 'about.html',
  '/governance': 'governance.html',
  '/contact': 'contact.html',
  '/faq': 'faq.html',
  '/privacy': 'privacy.html',
  '/terms': 'terms.html',
  '/reports': 'reports.html',
  '/press': 'press.html',
  '/accessibility': 'accessibility.html',
  '/portal/partner': 'portal-partner.html',
  '/portal/volunteer': 'portal-volunteer.html',
  '/portal/admin': 'portal-admin.html'
};

for (const [route, file] of Object.entries(pages)) {
  app.get(route, (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
}

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`[charmfoundation] listening on http://localhost:${PORT}`);
});

export default app;
