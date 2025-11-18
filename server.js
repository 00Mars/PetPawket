// server.js — Hybrid JWT + Shopify underlay

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import debugRoutes from './routes/debugRoutes.js';
import {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  ensureUser
} from './userDB.pg.js';

import { createToken, verifyPassword, hashPassword } from './utils/auth.js';
import { requireAuth, softSession, requireShopifyCustomer } from './middleware/requireAuth.js';

import addressesRouter from './routes/addressesRoutes.js';
import productsRouter from './routes/productsRoutes.js';
import searchRouter from './routes/searchRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import passwordRoutes from './routes/passwordRoutes.js'

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/api/auth', passwordRoutes);

app.use('/api/debug', debugRoutes);

// Disable ETag for dynamic
app.set('etag', false);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

function apiNoStore(_req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}
app.use('/api', apiNoStore);

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* -------------------- Mount routers -------------------- */
app.use('/api/addresses', addressesRouter);
app.use('/api/products', productsRouter);
app.use('/api/search', searchRouter);
app.use('/api/cart', cartRoutes);

/* -------------------- Health -------------------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* -------------------- Shopify GraphQL helper (commerce only) -------------------- */
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || '';
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-07';
const SF_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

async function shopifyGQL(query, variables) {
  const res = await fetch(SF_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

/* Small helper used below */
function readCookie(req, key) {
  const raw = req?.headers?.cookie || '';
  if (!raw) return null;
  const parts = raw.split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (decodeURIComponent(k) === key) {
      try { return decodeURIComponent(v || ''); } catch { return v || ''; }
    }
  }
  return null;
}

/* -------------------- LOGIN (Hybrid) --------------------
   Returns: local JWT + (optional) Shopify customerAccessToken
---------------------------------------------------------- */
async function handleLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }

    let user = await getUserByEmail(normalizedEmail);

    // Validate local password if hash exists
    if (user?.passwordHash) {
      const okLocal = await verifyPassword(password, user.passwordHash);
      if (!okLocal) {
        // Try Shopify anyway (user might have set only a Shopify password earlier)
      }
    }

    // Attempt Shopify customerAccessTokenCreate
    let shopifyToken = null;
    let shopifyError = null;
    try {
      const mutation = /* GraphQL */ `
        mutation Login($input: CustomerAccessTokenCreateInput!) {
          customerAccessTokenCreate(input: $input) {
            customerAccessToken { accessToken, expiresAt }
            customerUserErrors { field, message, code }
          }
        }
      `;
      const resp = await shopifyGQL(mutation, { input: { email: normalizedEmail, password } });
      const payload = resp?.data?.customerAccessTokenCreate;
      shopifyToken = payload?.customerAccessToken?.accessToken || null;
      if (!shopifyToken && payload?.customerUserErrors?.length) {
        shopifyError = payload.customerUserErrors.map(e => e?.message).filter(Boolean).join('; ');
      }
    } catch (e) {
      shopifyError = e?.message || 'Shopify login failed';
    }

    // If no local user, create one (auto-link). If legacy (passwordHash null) and Shopify succeeded, hash now.
    if (!user) {
      const passwordHash = shopifyToken ? await hashPassword(password) : null;
      user = await createUser({
        email: normalizedEmail,
        firstName: '',
        lastName: '',
        passwordHash
      });
    } else if (!user.passwordHash && shopifyToken) {
      // Legacy user without local password; set it now.
      const passwordHash = await hashPassword(password);
      await updateUser(user.id, { passwordHash });
      user = await getUserById(user.id);
    }

    // If user has passwordHash, enforce local password validity unless Shopify succeeded.
    if (user.passwordHash) {
      const localOK = await verifyPassword(password, user.passwordHash);
      if (!localOK && !shopifyToken) {
        return res.status(401).json({ ok: false, error: 'Invalid credentials' });
      }
    } else if (!shopifyToken) {
      // No password hash and Shopify failed => cannot authenticate
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const jwt = createToken({ id: user.id, email: user.email });

    // Set HttpOnly Shopify cookie if we obtained a token
    if (shopifyToken) {
      const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      res.cookie?.('shopify_token', shopifyToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeMs
      }) || res.setHeader(
        'Set-Cookie',
        `shopify_token=${encodeURIComponent(shopifyToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs/1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      );
    }

    return res.json({
      ok: true,
      token: jwt,
      shopifyAccessToken: shopifyToken || null,
      shopifyLinked: !!shopifyToken,
      shopifyError: shopifyToken ? null : shopifyError,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      }
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
}
app.post('/api/auth/login', handleLogin);
app.post('/api/login', handleLogin);

/* -------------------- SIGNUP (Hybrid) --------------------
   Creates local user + attempts Shopify customer create + auto-login.
---------------------------------------------------------- */
async function handleSignup(req, res) {
  try {
    const { email, password, firstName = '', lastName = '' } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });
    }
    if (firstName.length > 100 || lastName.length > 100) {
      return res.status(400).json({ ok: false, error: 'Name fields too long' });
    }

    let existing = await getUserByEmail(normalizedEmail);
    if (existing?.passwordHash) {
      return res.status(409).json({ ok: false, error: 'Email already registered' });
    }

    // Create or update local user with hashed password
    const passwordHash = await hashPassword(password);
    if (!existing) {
      existing = await createUser({
        email: normalizedEmail,
        firstName,
        lastName,
        passwordHash
      });
    } else {
      await updateUser(existing.id, { passwordHash, firstName, lastName });
      existing = await getUserById(existing.id);
    }

    // Shopify customerCreate + customerAccessTokenCreate
    let shopifyToken = null;
    let shopifyError = null;
    try {
      const createMutation = /* GraphQL */ `
        mutation customerCreate($input: CustomerCreateInput!) {
          customerCreate(input: $input) {
            customer { id email }
            customerUserErrors { field message }
          }
        }
      `;
      const createResp = await shopifyGQL(createMutation, { input: { email: normalizedEmail, password, firstName, lastName } });
      const createPayload = createResp?.data?.customerCreate;
      if (!createPayload?.customer && (createPayload?.customerUserErrors?.length)) {
        shopifyError = createPayload.customerUserErrors.map(e => e?.message).filter(Boolean).join('; ');
      } else if (createPayload?.customer) {
        const tokenMutation = /* GraphQL */ `
          mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
            customerAccessTokenCreate(input: $input) {
              customerAccessToken { accessToken, expiresAt }
              customerUserErrors { message }
            }
          }
        `;
        const tokenResp = await shopifyGQL(tokenMutation, { input: { email: normalizedEmail, password } });
        const tokenPayload = tokenResp?.data?.customerAccessTokenCreate;
        shopifyToken = tokenPayload?.customerAccessToken?.accessToken || null;
        if (!shopifyToken && (tokenPayload?.customerUserErrors?.length)) {
          shopifyError = tokenPayload.customerUserErrors.map(e => e?.message).filter(Boolean).join('; ');
        }
      }
    } catch (e) {
      shopifyError = e?.message || 'Shopify signup failed';
    }

    // Set cookie if we have token
    if (shopifyToken) {
      const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      res.cookie?.('shopify_token', shopifyToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeMs
      }) || res.setHeader(
        'Set-Cookie',
        `shopify_token=${encodeURIComponent(shopifyToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs/1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      );
    }

    const jwt = createToken({ id: existing.id, email: existing.email });

    return res.status(201).json({
      ok: true,
      token: jwt,
      shopifyAccessToken: shopifyToken || null,
      shopifyLinked: !!shopifyToken,
      shopifyError: shopifyToken ? null : shopifyError,
      user: {
        id: existing.id,
        email: existing.email,
        firstName: existing.firstName || '',
        lastName: existing.lastName || ''
      }
    });
  } catch (err) {
    console.error('[signup] error:', err);
    return res.status(500).json({ ok: false, error: 'Signup failed' });
  }
}
app.post('/api/auth/signup', handleSignup);
app.post('/signup', handleSignup);

/* -------------------- LOGOUT -------------------- */
function handleLogout(_req, res) {
  // Clear Shopify cookie (optional)
  res.cookie?.('shopify_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  }) || res.setHeader(
    'Set-Cookie',
    `shopify_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
  return res.json({ ok: true });
}
app.post('/api/auth/logout', handleLogout);
app.post('/api/logout', handleLogout);
app.post('/logout', handleLogout);

/* -------------------- SESSION & ME -------------------- */
app.get('/api/session', softSession);

app.get('/api/me', requireAuth(), async (req, res) => {
  try {
    const u = req.dbUser;
    if (!u) return res.status(401).json({ error: 'Unauthorized' });

    res.set('Cache-Control', 'no-store');
    return res.json({
      id: u.id,
      email: u.email,
      user: {
        id: u.id,
        email: u.email,
        firstName: u.firstName || '',
        lastName: u.lastName || ''
      },
      customer: {
        id: u.id,
        email: u.email,
        firstName: u.firstName || '',
        lastName: u.lastName || ''
      },
      shopifyLinked: !!readCookie(req, 'shopify_token')
    });
  } catch (e) {
    console.error('[GET /api/me] error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* -------------------- Profile (JWT protected) -------------------- */
function parseNameMaybeJSON(s, key) {
  if (typeof s !== 'string') return s ?? '';
  const t = s.trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return t;
  try {
    const o = JSON.parse(t);
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

app.get('/api/account/profile', requireAuth(), async (req, res) => {
  try {
    const u = req.dbUser;
    if (!u) return res.status(401).json({ error: 'No session' });

    const cleanFirst = parseNameMaybeJSON(u.firstName ?? '', 'firstName');
    const cleanLast  = parseNameMaybeJSON(u.lastName ?? '', 'lastName');

    if (cleanFirst !== (u.firstName ?? '') || cleanLast !== (u.lastName ?? '')) {
      await updateUser(u.id, { firstName: cleanFirst, lastName: cleanLast });
    }

    res.json({
      email: u.email,
      firstName: cleanFirst,
      lastName: cleanLast
    });
  } catch (e) {
    console.error('[profile:get] error:', e);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.post('/api/account/profile/update-info', requireAuth(), async (req, res) => {
  try {
    const u = req.dbUser;
    if (!u) return res.status(401).json({ error: 'No session' });

    const rawFirst = (req.body?.firstName ?? '').toString();
    const rawLast  = (req.body?.lastName  ?? '').toString();

    const firstName = parseNameMaybeJSON(rawFirst, 'firstName').trim();
    const lastName  = parseNameMaybeJSON(rawLast,  'lastName').trim();

    await updateUser(u.id, { firstName, lastName });
    const fresh = await getUserById(u.id);

    res.json({
      email: fresh.email,
      firstName: fresh.firstName,
      lastName: fresh.lastName
    });
  } catch (e) {
    console.error('[profile:update] error:', e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/* -------------------- Orders (needs Shopify customer) -------------------- */
app.get('/api/orders', requireAuth(), requireShopifyCustomer(), async (req, res) => {
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
    const json = await shopifyGQL(query, { token: req.customerToken || readCookie(req, 'shopify_token') });
    const edges = json?.data?.customer?.orders?.edges || [];
    const orders = edges.map(e => e.node);
    return res.json({ ok: true, orders });
  } catch (e) {
    console.error('[orders] error:', e);
    return res.status(500).json({ ok: false, error: 'Failed to fetch orders' });
  }
});

/* -------------------- Preferences: For My Pets -------------------- */
app.get('/api/prefs/forMyPets', requireAuth(), async (req, res) => {
  try {
    const u = req.dbUser;
    if (!u) return res.status(401).json({ error: 'No session' });
    const on = !!(u?.preferences?.forMyPets?.on);
    return res.json({ on });
  } catch (e) {
    console.error('[prefs] GET error:', e);
    return res.status(500).json({ error: 'Failed to load preference' });
  }
});

app.post('/api/prefs/forMyPets', requireAuth(), async (req, res) => {
  try {
    const u = req.dbUser;
    if (!u) return res.status(401).json({ error: 'No session' });
    const on = req?.body?.on === true;
    const prev = u?.preferences || {};
    const next = { ...prev, forMyPets: { ...(prev.forMyPets || {}), on } };
    await updateUser(u.id, { preferences: next });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[prefs] POST error:', e);
    return res.status(500).json({ error: 'Failed to save preference' });
  }
});

/* -------------------- Suggestions Probe (placeholder) -------------------- */
const subsSuggestHandler = async (req, res) => {
  try {
    const petId = String(req.query.pet || '').trim();
    return res.json({ ok: true, petId, suggestions: [] });
  } catch (e) {
    console.error('[subs] suggest error:', e);
    return res.status(500).json({ ok: false, suggestions: [] });
  }
};
app.get('/api/subscriptions/suggest', subsSuggestHandler);
app.get('/api/subs/suggest', subsSuggestHandler);

/* -------------------- Basic HTML entries -------------------- */
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/navbar.html', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'navbar.html')));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

export default app;