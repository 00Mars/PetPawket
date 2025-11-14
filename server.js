// server.js — Express 5, ESM, cookie-based Shopify auth (no Clerk), Postgres profile

import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// ✅ Use the shared DB layer (camelCase⇄snake_case handled here)
import { ensureUser, getUserByEmail, updateUser } from './userDB.pg.js';

import { requireAuth, softSession } from './middleware/requireAuth.js';
import { signToken } from './utils/jwt.js';
import addressesRouter from './routes/addressesRoutes.js';
import productsRouter from './routes/productsRoutes.js';
import searchRouter from './routes/searchRoutes.js';
import cartRoutes from './routes/cartRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

const NODE_ENV = process.env.NODE_ENV || 'development';
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⛔ Disable ETags for dynamic responses (prevents 304 on JSON APIs)
app.set('etag', false);

// Body parsers (once)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// 🔒 No-store for all API routes (dynamic data should never be cached by the browser)
function apiNoStore(_req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}
app.use('/api', apiNoStore);

// Static (keep normal caching for assets)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Addresses API (mounted early so 404s are obvious) ------------------------
app.use('/api/addresses', addressesRouter);
console.log('[mount] /api/addresses');

// --- Products proxy API -------------------------------------------------------
app.use('/api/products', productsRouter);
console.log('[mount] /api/products');

// --- Search API ---------------------------------------------------------------
app.use('/api/search', searchRouter);
console.log('[mount] /api/search');

// --- Cart API (PG-backed) -----------------------------------------------------
app.use('/api/cart', cartRoutes);
console.log('[mount] /api/cart');

// --- Shopify helpers ----------------------------------------------------------
const SF_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/2024-07/graphql.json`;

async function shopifyGQL(query, variables) {
  const res = await fetch(SF_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return json;
}

// --- Health -------------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- Auth ---------------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });

    const mutation = /* GraphQL */ `
      mutation Login($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken { accessToken, expiresAt }
          customerUserErrors { field, message, code }
        }
      }
    `;
    const resp = await shopifyGQL(mutation, { input: { email, password } });
    const payload = resp?.data?.customerAccessTokenCreate;

    const shopifyToken = payload?.customerAccessToken?.accessToken;
    const errMsg = payload?.customerUserErrors?.[0]?.message;
    if (!shopifyToken) {
      return res.status(401).json({ ok: false, error: errMsg || 'Invalid credentials' });
    }

    // Fetch customer details from Shopify
    const query = /* GraphQL */ `
      query WhoAmI($token: String!) {
        customer(customerAccessToken: $token) {
          id
          email
          firstName
          lastName
        }
      }
    `;
    const customerResp = await shopifyGQL(query, { token: shopifyToken });
    const customer = customerResp?.data?.customer;

    if (!customer || !customer.email) {
      return res.status(401).json({ ok: false, error: 'Failed to fetch customer details' });
    }

    // ✅ Seed/ensure user row via shared DB layer (normalize email case)
    const normalizedEmail = String(customer.email).trim().toLowerCase();
    await ensureUser(normalizedEmail, customer.firstName || '', customer.lastName || '');

    // Create JWT token with customer data and Shopify token
    const jwtPayload = {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      id: customer.id,
      shopifyToken, // Store Shopify token in JWT for backend API calls
    };
    const token = signToken(jwtPayload);

    // Return JWT token and user info
    res.json({
      ok: true,
      token,
      user: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        id: customer.id,
      },
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

// Alternative /api/login endpoint for backward compatibility
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });

    const mutation = /* GraphQL */ `
      mutation Login($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken { accessToken, expiresAt }
          customerUserErrors { field, message, code }
        }
      }
    `;
    const resp = await shopifyGQL(mutation, { input: { email, password } });
    const payload = resp?.data?.customerAccessTokenCreate;

    const shopifyToken = payload?.customerAccessToken?.accessToken;
    const errMsg = payload?.customerUserErrors?.[0]?.message;
    if (!shopifyToken) {
      return res.status(401).json({ ok: false, error: errMsg || 'Invalid credentials' });
    }

    // Fetch customer details from Shopify
    const query = /* GraphQL */ `
      query WhoAmI($token: String!) {
        customer(customerAccessToken: $token) {
          id
          email
          firstName
          lastName
        }
      }
    `;
    const customerResp = await shopifyGQL(query, { token: shopifyToken });
    const customer = customerResp?.data?.customer;

    if (!customer || !customer.email) {
      return res.status(401).json({ ok: false, error: 'Failed to fetch customer details' });
    }

    // ✅ Seed/ensure user row via shared DB layer (normalize email case)
    const normalizedEmail = String(customer.email).trim().toLowerCase();
    await ensureUser(normalizedEmail, customer.firstName || '', customer.lastName || '');

    // Create JWT token with customer data and Shopify token
    const jwtPayload = {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      id: customer.id,
      shopifyToken, // Store Shopify token in JWT for backend API calls
    };
    const token = signToken(jwtPayload);

    // Return JWT token and user info
    res.json({
      ok: true,
      token,
      user: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        id: customer.id,
      },
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

app.post('/logout', (req, res) => {
  // JWT is stateless, so logout is handled client-side by removing the token
  // No server-side state to clear
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  // JWT is stateless, so logout is handled client-side by removing the token
  // No server-side state to clear
  res.json({ ok: true });
});

app.get('/api/session', softSession);

app.get('/api/me', requireAuth, async (req, res) => {
  res.json({ customer: req.customer });
});

/* --------- Name normalization helpers (fixes old JSON-blob saves) --------- */
function parseNameMaybeJSON(s, key) {
  if (typeof s !== 'string') return s ?? '';
  const t = s.trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return t;
  try {
    const o = JSON.parse(t);
    // Prefer exact key, but accept common variants
    return (
      o?.[key] ??
      (key === 'firstName'
        ? (o.first_name || o.given_name || o.first)
        : (o.last_name || o.family_name || o.last)) ??
      ''
    );
  } catch {
    return t;
  }
}

/* --- Profile API (PG-backed; uses shared DB and lowercased email) ----------- */
app.get('/api/account/profile', requireAuth, async (req, res) => {
  try {
    const emailRaw = req.customer?.email;
    if (!emailRaw) return res.status(401).json({ error: 'No session' });
    const email = String(emailRaw).trim().toLowerCase();

    // Make sure we have a row, seeding with Shopify names if available
    await ensureUser(
      email,
      req.customer?.firstName || req.customer?.first_name || '',
      req.customer?.lastName  || req.customer?.last_name  || ''
    );

    const u = await getUserByEmail(email);
    const clean = {
      email: u?.email || email,
      firstName: parseNameMaybeJSON(u?.firstName ?? '', 'firstName'),
      lastName : parseNameMaybeJSON(u?.lastName  ?? '', 'lastName'),
    };

    // If normalization changed values, persist the clean ones silently
    if (clean.firstName !== (u?.firstName ?? '') || clean.lastName !== (u?.lastName ?? '')) {
      await updateUser(u.id, { firstName: clean.firstName, lastName: clean.lastName });
    }

    res.json(clean);
  } catch (e) {
    console.error('[profile:get] error:', e);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.post('/api/account/profile/update-info', requireAuth, async (req, res) => {
  try {
    const emailRaw = req.customer?.email;
    if (!emailRaw) return res.status(401).json({ error: 'No session' });
    const email = String(emailRaw).trim().toLowerCase();

    // Coerce & sanitize
    const rawFirst = (req.body?.firstName ?? '').toString();
    const rawLast  = (req.body?.lastName  ?? '').toString();

    const firstName = parseNameMaybeJSON(rawFirst, 'firstName').trim();
    const lastName  = parseNameMaybeJSON(rawLast,  'lastName').trim();

    // Ensure a row exists, then update via shared helper by id
    const user = await ensureUser(email, '', '');
    await updateUser(user.id, { firstName, lastName });

    const fresh = await getUserByEmail(email);
    res.json({
      email: fresh?.email || email,
      firstName: fresh?.firstName ?? null,
      lastName: fresh?.lastName ?? null,
    });
  } catch (e) {
    console.error('[profile:update] error:', e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// --- Orders (Shopify) ---------------------------------------------------------
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const query = /* GraphQL */ `
      query Orders($token: String!) {
        customer(customerAccessToken: $token) {
          orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
            edges {
              node {
                id
                name
                orderNumber
                processedAt
                statusUrl
                totalPriceV2 { amount currencyCode }
                lineItems(first: 20) { edges { node { title quantity } } }
              }
            }
          }
        }
      }
    `;
    const j = await shopifyGQL(query, { token: req.customerToken });
    const edges = j?.data?.customer?.orders?.edges || [];
    const orders = edges.map(e => e.node);
    res.json(orders);
  } catch (err) {
    console.error('[orders] error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/* -------------------------------------------------------------------------- */
/*                FIX: Persisted “For My Pets” prefs (server-side)            */
/* -------------------------------------------------------------------------- */
// Shape used by frontend: GET → { on: boolean }, POST { on:boolean } → 200
app.get('/api/prefs/forMyPets', requireAuth, async (req, res) => {
  try {
    const email = String(req.customer?.email || '').trim().toLowerCase();
    if (!email) return res.status(401).json({ error: 'No session' });

    const u = await getUserByEmail(email);
    const on = !!(u?.preferences?.forMyPets?.on);
    return res.json({ on });
  } catch (e) {
    console.error('[prefs] GET /api/prefs/forMyPets error:', e);
    return res.status(500).json({ error: 'Failed to load preference' });
  }
});

app.post('/api/prefs/forMyPets', requireAuth, async (req, res) => {
  try {
    const email = String(req.customer?.email || '').trim().toLowerCase();
    if (!email) return res.status(401).json({ error: 'No session' });

    const on = req?.body?.on === true;

    // Ensure user + merge preferences JSON
    const u = await ensureUser(email, '', '');
    const prev = u?.preferences || {};
    const next = { ...prev, forMyPets: { ...(prev.forMyPets || {}), on } };

    await updateUser(u.id, { preferences: next });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[prefs] POST /api/prefs/forMyPets error:', e);
    return res.status(500).json({ error: 'Failed to save preference' });
  }
});

/* -------------------------------------------------------------------------- */
/*             FIX: Suggestions probe endpoints (stop 404 noise)              */
/*             Returns empty list for now; wire real logic later              */
/* -------------------------------------------------------------------------- */
const subsSuggestHandler = async (req, res) => {
  try {
    // If you want gating, add requireAuth to the route registrations below.
    const petId = String(req.query.pet || '').trim();
    return res.json({ ok: true, petId, suggestions: [] });
  } catch (e) {
    console.error('[subs] GET suggest error:', e);
    return res.status(500).json({ ok: false, suggestions: [] });
  }
};
app.get('/api/subscriptions/suggest', subsSuggestHandler);
app.get('/api/subs/suggest', subsSuggestHandler);

// ---------- Shop listing HTML entry (moved from /products to /shop) -----------
app.get('/shop', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});
// Back-compat redirects for old paths:
app.get(['/products', 'shop.html'], (_req, res) => res.redirect(301, '/shop'));

// --- Product detail HTML entry (kept: /products/:handle and /product/:handle) -
app.get(['/products/:handle', '/product/:handle'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

// Optional: canonicalize /product.html?handle=... to pretty route
app.get('/shop.html', (req, res) => {
  const handle = String(req.query.handle || '');
  if (handle) return res.redirect(302, `/products/${encodeURIComponent(handle)}`);
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

// --- Pets/Wishlist/Journal routes (mounted if present) ------------------------
try {
  const petsRoutes = (await import('./routes/petsRoutes.js')).default;
  app.use('/api/pets', petsRoutes);
  console.log('[mount] /api/pets');
} catch (e) {
  // optional
}

try {
  const journalRoutes = (await import('./routes/journalRoutes.js')).default;
  // Legacy/compat profile+journal endpoints (user & pet journals)
  app.use('/api/profile', journalRoutes);
  console.log('[mount] /api/profile');
} catch (e) {
  // optional
}

try {
  const wishlistRoutes = (await import('./routes/wishlistRoutes.js')).default;
  app.use('/api/wishlist', wishlistRoutes);
  console.log('[mount] /api/wishlist');
} catch (e) {
  // optional
}

// HTML entry points always available
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/navbar.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'navbar.html'));
});

app.listen(PORT, () => {
  console.log(`[server] up on http://localhost:${PORT}`);
});