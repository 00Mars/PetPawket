// middleware/requireAuth.js
// Hybrid: JWT-first with Shopify cookie fallback.
// Restored guarantees:
// - Fallback defaults to ON (unless SHOPIFY_COOKIE_FALLBACK="false").
// - In cookie path, we ENSURE a DB user exists and attach req.dbUser so /api/me works.

import fetch from 'node-fetch';
import { verifyToken } from '../utils/auth.js';
import { getUserById, ensureUser } from '../userDB.pg.js';

/* -------------------- Config -------------------- */
// Default ON unless explicitly set to "false"
const FALLBACK_ENABLED = String(process.env.SHOPIFY_COOKIE_FALLBACK ?? 'true').toLowerCase() === 'true';

const RAW_DOMAIN       = process.env.SHOPIFY_DOMAIN || '';
const SHOPIFY_DOMAIN   = sanitizeDomain(RAW_DOMAIN);
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
const API_VERSION      = process.env.SHOPIFY_API_VERSION || '2024-07';
const TIMEOUT_MS       = parseInt(process.env.SHOPIFY_TIMEOUT_MS || '5000', 10);
const CACHE_TTL_MS     = parseInt(process.env.SHOPIFY_AUTH_CACHE_TTL_MS || '600000', 10);

const SF_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;
const tokenCache = new Map();

/* -------------------- softSession (non-blocking) -------------------- */
export async function softSession(req, res) {
  try {
    const jwtToken = extractBearer(req) || readCookie(req, 'auth_token');
    if (jwtToken) {
      try {
        const decoded = verifyToken(jwtToken);
        const user = await getUserById(decoded.id);
        if (user && user.email.toLowerCase() === decoded.email.toLowerCase()) {
          req.customer = synthCustomerFromUser(user);
          req.user = { id: user.id, email: user.email };
          req.dbUser = user;
          req.authToken = jwtToken;
          return res.json({
            signedIn: true,
            email: user.email,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            mode: 'jwt'
          });
        }
      } catch {/* ignore */}
    }

    if (FALLBACK_ENABLED) {
      const shopToken = readCookie(req, 'shopify_token');
      if (shopToken) {
        const customer = await getCustomerSafe(shopToken);
        if (customer) {
          req.customer = customer;
          req.shopifyToken = shopToken;
          req.customerToken = shopToken;
          return res.json({
            signedIn: true,
            email: customer.email || null,
            firstName: customer.firstName || null,
            lastName: customer.lastName || null,
            mode: 'shopify-fallback'
          });
        }
      }
    }

    return res.json({ signedIn: false });
  } catch {
    return res.json({ signedIn: false });
  }
}

/* -------------------- requireAuth (JWT-first) -------------------- */
export function requireAuth(...args) {
  if (args.length !== 3 || !args[0] || !args[1] || !args[2]) {
    return (req, res, next) => requireAuth(req, res, next);
  }
  const [req, res, next] = args;

  (async () => {
    try {
      // 1) JWT path
      const jwtToken = extractBearer(req) || readCookie(req, 'auth_token');
      if (jwtToken) {
        try {
          const decoded = verifyToken(jwtToken);
          if (!decoded?.id || !decoded?.email) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
          const user = await getUserById(decoded.id);
          if (!user || user.email.toLowerCase() !== decoded.email.toLowerCase()) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
          req.user = { id: user.id, email: user.email };
          req.dbUser  = user;
          req.customer = synthCustomerFromUser(user);
          req.authToken = jwtToken;
          return next();
        } catch {
          if (!FALLBACK_ENABLED) return res.status(401).json({ error: 'Unauthorized' });
        }
      } else if (!FALLBACK_ENABLED) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 2) Shopify cookie fallback
      if (FALLBACK_ENABLED) {
        const shopToken = readCookie(req, 'shopify_token');
        if (!shopToken) return res.status(401).json({ error: 'Unauthorized' });

        try {
          const customer = await getCustomerStrict(shopToken);
          req.customer = customer;
          req.shopifyToken = shopToken;
          req.customerToken = shopToken;

          // CRITICAL: ensure a DB user exists and attach it
          if (customer?.email) {
            const dbUser = await ensureUser(
              customer.email.toLowerCase(),
              customer.firstName || '',
              customer.lastName  || ''
            );
            req.user = { id: dbUser.id, email: dbUser.email };
            req.dbUser = dbUser;
          }
          return next();
        } catch (err) {
          if (isTimeout(err)) {
            const cached = getCached(shopToken);
            if (cached) {
              console.warn('[requireAuth] Shopify timeout; using cached customer.');
              req.customer = cached;
              req.shopifyToken = shopToken;
              req.customerToken = shopToken;
              // best-effort ensure from cached email
              if (cached?.email) {
                try {
                  const dbUser = await ensureUser(
                    cached.email.toLowerCase(),
                    cached.firstName || '',
                    cached.lastName || ''
                  );
                  req.user = { id: dbUser.id, email: dbUser.email };
                  req.dbUser = dbUser;
                } catch {}
              }
              return next();
            }
            return res.status(503).json({ error: 'Shopify auth timeout' });
          }
          if (isUnauthorized(err)) return res.status(401).json({ error: 'Unauthorized' });
          console.error('[requireAuth] fallback error:', err);
          return res.status(500).json({ error: 'Auth verification failed' });
        }
      }
    } catch (outer) {
      console.error('[requireAuth] outer error:', outer);
      try { return res.status(500).json({ error: 'Auth middleware error' }); }
      catch { return next(outer); }
    }
  })();
}

/* -------------------- optional auth attachment -------------------- */
export async function attachAuthIfPresent(req) {
  try {
    const jwtToken = extractBearer(req) || readCookie(req, 'auth_token');
    if (jwtToken) {
      try {
        const decoded = verifyToken(jwtToken);
        if (decoded?.id && decoded?.email) {
          const user = await getUserById(decoded.id);
          if (user && user.email.toLowerCase() === decoded.email.toLowerCase()) {
            req.user = { id: user.id, email: user.email };
            req.dbUser = user;
            req.customer = synthCustomerFromUser(user);
            req.authToken = jwtToken;
            return true;
          }
        }
      } catch {
        // Fall through to Shopify cookie fallback.
      }
    }

    if (!FALLBACK_ENABLED) return false;
    const shopToken = readCookie(req, 'shopify_token');
    if (!shopToken) return false;

    const customer = await getCustomerSafe(shopToken);
    if (!customer) return false;
    req.customer = customer;
    req.shopifyToken = shopToken;
    req.customerToken = shopToken;

    if (customer?.email) {
      const dbUser = await ensureUser(
        customer.email.toLowerCase(),
        customer.firstName || '',
        customer.lastName || ''
      );
      req.user = { id: dbUser.id, email: dbUser.email };
      req.dbUser = dbUser;
    }
    return true;
  } catch {
    return false;
  }
}

/* -------------------- requireShopifyCustomer -------------------- */
export function requireShopifyCustomer(...args) {
  if (args.length !== 3 || !args[0] || !args[1] || !args[2]) {
    return (req, res, next) => requireShopifyCustomer(req, res, next);
  }
  const [req, res, next] = args;

  (async () => {
    try {
      const headerToken = req.headers['x-shopify-customer-token'];
      const cookieToken = readCookie(req, 'shopify_token');
      const token = headerToken || req.shopifyToken || cookieToken;
      if (req.customer && req.customer.id && req.customer.email && token) {
        req.customerToken = token;
        return next();
      }

      if (!token) return res.status(401).json({ error: 'Shopify customer token missing' });

      try {
        const customer = await getCustomerStrict(token);
        req.customer = customer;
        req.shopifyToken = token;
        req.customerToken = token;
        return next();
      } catch (err) {
        if (isTimeout(err)) return res.status(503).json({ error: 'Shopify auth timeout' });
        if (isUnauthorized(err)) return res.status(401).json({ error: 'Unauthorized' });
        console.error('[requireShopifyCustomer] error:', err);
        return res.status(500).json({ error: 'Shopify verification failed' });
      }
    } catch (outer) {
      console.error('[requireShopifyCustomer] outer error:', outer);
      return res.status(500).json({ error: 'Auth middleware error' });
    }
  })();
}

/* -------------------- Shopify Customer Fetch Logic -------------------- */
async function getCustomerStrict(token) {
  const cached = getCached(token);
  if (cached) return cached;
  const c = await fetchCustomerWithRetry(token);
  if (!c) throw unauthorized('Missing customer');
  setCached(token, c);
  return c;
}

async function getCustomerSafe(token) {
  const cached = getCached(token);
  if (cached) return cached;
  try {
    const c = await fetchCustomerWithRetry(token);
    if (!c) return null;
    setCached(token, c);
    return c;
  } catch (err) {
    if (isTimeout(err) || isUnauthorized(err)) return null;
    console.warn('[getCustomerSafe] non-fatal:', briefError(err));
    return null;
  }
}

async function fetchCustomerWithRetry(token, retries = 1) {
  try {
    return await fetchCustomer(token);
  } catch (err) {
    if (retries > 0 && (isTimeout(err) || isTransient(err))) {
      await sleep(200);
      return fetchCustomerWithRetry(token, retries - 1);
    }
    throw err;
  }
}

async function fetchCustomer(token) {
  if (!SHOPIFY_DOMAIN || !STOREFRONT_TOKEN) {
    throw new Error('Shopify env not configured (SHOPIFY_DOMAIN / SHOPIFY_STOREFRONT_TOKEN)');
  }
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
  const json = await fetchWithTimeout(
    SF_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables: { token } }),
    },
    TIMEOUT_MS
  );

  if (!json || json.errors) {
    const e = new Error(json?.errors ? JSON.stringify(json.errors) : 'GraphQL error');
    e.status = 401;
    throw e;
  }
  const customer = json?.data?.customer;
  if (!customer?.email) {
    const e = new Error('No customer for token');
    e.status = 401;
    throw e;
  }
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
  };
}

/* -------------------- Fetch With Timeout -------------------- */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text().catch(() => '');
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    return json;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('ETIMEDOUT');
      e.code = 'ETIMEDOUT';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

/* -------------------- Helpers -------------------- */
function extractBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  if (!/^Bearer\s+/i.test(h)) return null;
  return h.replace(/^Bearer\s+/i, '').trim();
}
function synthCustomerFromUser(user) {
  return { id: user.id, email: user.email, firstName: user.firstName || '', lastName: user.lastName || '' };
}
function setCached(token, customer) { tokenCache.set(token, { customer, ts: Date.now() }); }
function getCached(token) {
  const hit = tokenCache.get(token);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) { tokenCache.delete(token); return null; }
  return hit.customer;
}
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
function sanitizeDomain(domain) {
  return String(domain || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}
function isTimeout(err) { return err?.code === 'ETIMEDOUT' || err?.name === 'AbortError'; }
function isUnauthorized(err) { return err?.status === 401; }
function isTransient(err) { return ['ECONNRESET', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH'].includes(err?.code); }
function unauthorized(msg = 'Unauthorized') { const e = new Error(msg); e.status = 401; return e; }
function briefError(err) { const base = err?.message || String(err); const code = err?.code ? ` code=${err.code}` : ''; const status = err?.status ? ` status=${err.status}` : ''; return `${base}${code}${status}`; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default { softSession, requireAuth, attachAuthIfPresent, requireShopifyCustomer };
