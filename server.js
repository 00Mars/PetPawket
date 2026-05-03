// server.js — Hybrid JWT + Shopify underlay

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import crypto from 'crypto';
import debugRoutes from './routes/debugRoutes.js';
import {
  getUserByEmail,
  getUserByEmailWithPassword,
  getUserById,
  getUserByIdWithPassword,
  createUser,
  updateUser,
  ensureUser,
  pingDb,
  createLoopToken,
  getLoopTokenByOrderId,
  getLoopTokenByCode,
  addLoopTokenLink,
  allocateImpactForRedemption,
  appendCharmPoints,
  awardBadge,
  countSuccessfulShares,
  countSharesInWindow
} from './userDB.pg.js';

import { createToken, verifyPassword, hashPassword } from './utils/auth.js';
import { requireAuth, softSession, requireShopifyCustomer } from './middleware/requireAuth.js';

import addressesRouter from './routes/addressesRoutes.js';
import productsRouter from './routes/productsRoutes.js';
import searchRouter from './routes/searchRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import passwordRoutes from './routes/passwordRoutes.js'
import petsRoutes from './routes/petsRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import loopRoutes from './routes/loopRoutes.js';
import networkRoutes from './routes/networkRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function logError(tag, err, extra = {}) {
  const payload = {
    message: err?.message || String(err),
    code: err?.code || err?.name || undefined,
    stack: err?.stack,
    ...extra,
  };
  console.error(tag, payload);
}

// If behind a proxy/CDN, enable trust proxy so Secure cookies behave correctly
app.set('trust proxy', 1);

app.use('/api/debug', debugRoutes);

// Disable ETag for dynamic
app.set('etag', false);
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: false }));

function apiNoStore(_req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}
app.use('/api', apiNoStore);

// Static
app.get('/favicon.ico', (_req, res) => {
  res.redirect(302, '/favicon.svg');
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* -------------------- Mount routers -------------------- */
app.use('/api/addresses', addressesRouter);
app.use('/api/products', productsRouter);
app.use('/api/search', searchRouter);
app.use('/api/cart', cartRoutes);
app.use('/api/auth', passwordRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/loop', loopRoutes);
app.use('/api/network', networkRoutes);
console.log('[mount] /api/pets');

/* -------------------- Health -------------------- */
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/health/db', async (_req, res) => {
  try {
    const ok = await pingDb();
    res.json({ ok: !!ok });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

/* -------------------- Shopify Webhooks -------------------- */
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

function verifyShopifyWebhook(req) {
  const hmac = req.get('X-Shopify-Hmac-Sha256') || '';
  if (!WEBHOOK_SECRET) {
    return process.env.NODE_ENV !== 'production';
  }
  if (!hmac || !req.rawBody) return false;
  const digest = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('base64');
  const a = Buffer.from(digest, 'utf8');
  const b = Buffer.from(hmac, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function pickAttr(list, key) {
  if (!Array.isArray(list)) return null;
  const needle = String(key || '').toLowerCase();
  for (const item of list) {
    const name = String(item?.name || item?.key || '').toLowerCase();
    if (name === needle) return item?.value ?? null;
  }
  return null;
}

function extractLoopToken(order) {
  const pools = [
    order?.note_attributes,
    order?.attributes,
    order?.cart_attributes,
  ];
  for (const list of pools) {
    const v = pickAttr(list, 'loop_token') || pickAttr(list, 'loop-token');
    if (v) return String(v).trim().toUpperCase();
  }
  return '';
}

function parseMoney(value) {
  if (value == null) return 0;
  if (typeof value === 'object') {
    const amt = value?.amount ?? value?.shop_money?.amount ?? value?.presentment_money?.amount;
    if (amt != null) value = amt;
  }
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function extractOrderSubtotal(order) {
  return (
    parseMoney(order?.current_subtotal_price) ||
    parseMoney(order?.current_subtotal_price_set?.shop_money?.amount) ||
    parseMoney(order?.subtotal_price) ||
    parseMoney(order?.total_line_items_price) ||
    0
  );
}

app.post('/webhooks/shopify/orders-paid', async (req, res) => {
  const webhookMeta = {
    topic: req.get('X-Shopify-Topic') || '',
    shop: req.get('X-Shopify-Shop-Domain') || '',
  };
  let orderId = '';
  let email = '';
  try {
    if (!verifyShopifyWebhook(req)) {
      console.warn('[loop] webhook invalid signature', webhookMeta);
      return res.status(401).send('Invalid webhook signature');
    }

    const order = req.body || {};
    orderId = String(order?.id || order?.order_id || '').trim();
    email = (order?.email || order?.customer?.email || '').trim().toLowerCase();
    if (!email) {
      console.warn('[loop] webhook missing email; skipping');
      return res.status(200).send('ok');
    }

    const user = await ensureUser(email, order?.customer?.first_name || '', order?.customer?.last_name || '');

    // 1) Handle redemption if token present
    const tokenCode = extractLoopToken(order);
    if (tokenCode) {
      const token = await getLoopTokenByCode(tokenCode);
      if (token && token.status === 'active') {
        const redemption = await addLoopTokenLink(token.id, user.id, orderId);
        if (redemption?.ok) {
          const senderId = redemption.senderUserId;
          const receiverId = user.id;
          const orderSubtotal = extractOrderSubtotal(order);
          const currency = order?.currency || order?.currency_code || 'USD';

          // First token shared (only when first redemption happens)
          if (redemption.previousPosition === 1 && senderId) {
            await appendCharmPoints(senderId, 10, 'first_token_shared', token.id);
          }

          // Token redeemed (both users)
          if (senderId) {
            await appendCharmPoints(senderId, 25, 'token_redeemed_sender', token.id);
          }
          await appendCharmPoints(receiverId, 25, 'token_redeemed_receiver', token.id);

          // Chain founder bonus at 10 links
          if (redemption.chainLength === 10 && token.createdByUserId) {
            await appendCharmPoints(token.createdByUserId, 50, 'chain_founder_bonus', token.id);
          }

          // Badge: 5 successful shares
          if (senderId) {
            const shareCount = await countSuccessfulShares(senderId);
            if (shareCount >= 5) {
              await awardBadge(senderId, 'kindness_spreader');
            }
          }

          // Track 3 shares in 3 days (pending reward)
          if (senderId) {
            const recent = await countSharesInWindow(senderId, 72);
            if (recent >= 3) {
              await appendCharmPoints(senderId, 0, 'shares_3_in_3_days_pending', token.id, { count: recent });
            }
          }

          // Impact ledger (hybrid funding)
          await allocateImpactForRedemption({
            tokenId: token.id,
            userId: receiverId,
            orderId,
            orderSubtotal,
            currency,
            meta: {
              senderId,
              chainLength: redemption.chainLength,
              previousPosition: redemption.previousPosition,
            },
          }).catch((e) => {
            console.warn('[loop] impact ledger error:', e);
          });
        }
      }
    }

    // 2) Always generate a new token for purchaser (idempotent by order id)
    if (orderId) {
      const existing = await getLoopTokenByOrderId(orderId);
      if (!existing) {
        // generate unique code
        let created = null;
        for (let i = 0; i < 5 && !created; i++) {
          const code = crypto.randomBytes(9).toString('hex').slice(0, 14).toUpperCase();
          try {
            created = await createLoopToken(user.id, orderId, code);
          } catch (e) {
            if (e?.code === '23505') continue;
            throw e;
          }
        }
      }
    }

    return res.status(200).send('ok');
  } catch (e) {
    logError('[loop] webhook error', e, { orderId, email, ...webhookMeta });
    return res.status(500).send('Webhook error');
  }
});

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

function isDbConnError(err) {
  const codes = new Set(['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'ETIMEDOUT']);
  if (codes.has(err?.code)) return true;
  if (Array.isArray(err?.errors) && err.errors.some(e => codes.has(e?.code))) return true;
  const msg = String(err?.message || '');
  if (/ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|ETIMEDOUT/i.test(msg)) return true;
  return false;
}

/* -------------------- LOGIN (Hybrid) --------------------
   Returns: local JWT + (optional) Shopify customerAccessToken
---------------------------------------------------------- */
async function handleLogin(req, res) {
  let normalizedEmail = '';
  try {
    const { email, password } = req.body || {};
    normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }

    let user = await getUserByEmailWithPassword(normalizedEmail);
    let localOK = false;
    let checkedLocal = false;

    // Validate local password if hash exists
    if (user?.passwordHash) {
      localOK = await verifyPassword(password, user.passwordHash);
      checkedLocal = true;
      if (!localOK) {
        return res.status(401).json({ ok: false, error: 'Invalid credentials' });
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

    // If no local user and Shopify failed, stop (no credentials to verify)
    if (!user && !shopifyToken) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    // If no local user, create one (auto-link). If legacy (passwordHash null) and Shopify succeeded, hash now.
    if (!user && shopifyToken) {
      const passwordHash = await hashPassword(password);
      user = await createUser({
        email: normalizedEmail,
        firstName: '',
        lastName: '',
        passwordHash
      });
    } else if (user && !user.passwordHash && shopifyToken) {
      // Legacy user without local password; set it now.
      const passwordHash = await hashPassword(password);
      await updateUser(user.id, { passwordHash });
      user = await getUserByIdWithPassword(user.id);
    }

    // If a local password exists, it is authoritative; Shopify is only used to link/sync.
    if (user?.passwordHash) {
      if (!checkedLocal) {
        localOK = await verifyPassword(password, user.passwordHash);
        checkedLocal = true;
      }
      if (!localOK && !shopifyToken) {
        return res.status(401).json({ ok: false, error: 'Invalid credentials' });
      }
    } else if (!shopifyToken) {
      // No password hash and Shopify failed => cannot authenticate
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const jwt = createToken({ id: user.id, email: user.email });
    const jwtMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

    // Set HttpOnly JWT cookie for unified auth across fetches
    res.cookie?.('auth_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: jwtMaxAgeMs
    }) || res.setHeader(
      'Set-Cookie',
      `auth_token=${encodeURIComponent(jwt)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(jwtMaxAgeMs/1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

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
    logError('[login] error', err, { email: normalizedEmail });
    if (isDbConnError(err)) {
      return res.status(503).json({
        ok: false,
        error: 'Database unavailable. Please start Postgres and try again.',
        code: 'DB_UNAVAILABLE'
      });
    }
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
}
app.post('/api/auth/login', handleLogin);
app.post('/api/login', handleLogin);

/* -------------------- SIGNUP (Hybrid) --------------------
   Creates local user + attempts Shopify customer create + auto-login.
---------------------------------------------------------- */
async function handleSignup(req, res) {
  let normalizedEmail = '';
  try {
    const { email, password, firstName = '', lastName = '' } = req.body || {};
    normalizedEmail = String(email || '').trim().toLowerCase();

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
    const jwtMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

    // Set HttpOnly JWT cookie for unified auth across fetches
    res.cookie?.('auth_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: jwtMaxAgeMs
    }) || res.setHeader(
      'Set-Cookie',
      `auth_token=${encodeURIComponent(jwt)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(jwtMaxAgeMs/1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

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
    logError('[signup] error', err, { email: normalizedEmail });
    if (isDbConnError(err)) {
      return res.status(503).json({
        ok: false,
        error: 'Database unavailable. Please start Postgres and try again.',
        code: 'DB_UNAVAILABLE'
      });
    }
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
  res.cookie?.('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  }) || res.setHeader(
    'Set-Cookie',
    `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
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

const QUEST_PROGRESS_KEY = 'storyQuestsV2';
const QUEST_ID_RE = /^[a-z0-9][a-z0-9-]{0,60}$/i;

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanQuestText(value, max = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanQuestDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanQuestStatus(value) {
  const status = String(value || '').toLowerCase();
  return ['available', 'active', 'completed'].includes(status) ? status : 'available';
}

function cleanQuestStatePayload(input = {}) {
  const source = Object.prototype.hasOwnProperty.call(plainObject(input), 'state')
    ? plainObject(input.state)
    : plainObject(input);
  const now = new Date().toISOString();
  const quests = {};

  for (const [questId, rawQuest] of Object.entries(plainObject(source.quests)).slice(0, 32)) {
    if (!QUEST_ID_RE.test(questId)) continue;
    const rawCheckpoints = plainObject(rawQuest?.checkpoints);
    const checkpoints = {};
    for (const [checkpointId, rawCheckpoint] of Object.entries(rawCheckpoints).slice(0, 24)) {
      if (!QUEST_ID_RE.test(checkpointId)) continue;
      const done = typeof rawCheckpoint === 'boolean' ? rawCheckpoint : !!rawCheckpoint?.done;
      checkpoints[checkpointId] = {
        done,
        source: cleanQuestText(rawCheckpoint?.source || 'manual', 24) || 'manual',
        completedAt: done ? cleanQuestDate(rawCheckpoint?.completedAt) || now : null,
      };
    }

    quests[questId] = {
      status: cleanQuestStatus(rawQuest?.status),
      startedAt: cleanQuestDate(rawQuest?.startedAt),
      completedAt: cleanQuestDate(rawQuest?.completedAt),
      checkpoints,
    };
  }

  const rewards = Array.isArray(source.rewards) ? source.rewards.slice(0, 12).map((item) => ({
    id: cleanQuestText(item?.id, 90),
    questId: cleanQuestText(item?.questId, 64),
    label: cleanQuestText(item?.label, 160),
    target: cleanQuestText(item?.target, 48),
    type: cleanQuestText(item?.type, 48),
    status: cleanQuestText(item?.status || 'preview', 32),
    points: Number.isFinite(Number(item?.points)) ? Math.max(0, Math.min(500, Number(item.points))) : 0,
    createdAt: cleanQuestDate(item?.createdAt) || now,
  })).filter(item => item.id && item.label) : [];

  const handoffs = Array.isArray(source.handoffs) ? source.handoffs.slice(0, 20).map((item) => ({
    id: cleanQuestText(item?.id, 90),
    questId: cleanQuestText(item?.questId, 64),
    checkpointId: cleanQuestText(item?.checkpointId, 64),
    target: cleanQuestText(item?.target, 48),
    type: cleanQuestText(item?.type, 64),
    title: cleanQuestText(item?.title, 160),
    status: cleanQuestText(item?.status || 'queued', 32),
    createdAt: cleanQuestDate(item?.createdAt) || now,
    meta: plainObject(item?.meta),
  })).filter(item => item.id && item.target && item.title) : [];

  const rawStreak = plainObject(source.streak);
  const streak = {
    count: Number.isFinite(Number(rawStreak.count)) ? Math.max(0, Math.min(365, Number(rawStreak.count))) : 0,
    lastDate: /^\d{4}-\d{2}-\d{2}$/.test(String(rawStreak.lastDate || '')) ? rawStreak.lastDate : null,
  };

  return {
    version: 2,
    quests,
    rewards,
    handoffs,
    streak,
    updatedAt: now,
  };
}

app.get('/api/account/quests', requireAuth(), async (req, res) => {
  try {
    const u = req.dbUser;
    if (!u) return res.status(401).json({ ok: false, error: 'No session' });
    const fresh = await getUserById(u.id);
    const progress = plainObject(fresh?.progress);
    res.json({
      ok: true,
      state: progress[QUEST_PROGRESS_KEY] || null,
      charmPoints: Number(fresh?.charmPoints || 0),
      badges: Array.isArray(fresh?.badges) ? fresh.badges : [],
    });
  } catch (e) {
    console.error('[quests:get] error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load quest progress' });
  }
});

async function saveQuestProgress(req, res) {
  try {
    const u = req.dbUser;
    if (!u) return res.status(401).json({ ok: false, error: 'No session' });
    const state = cleanQuestStatePayload(req.body || {});
    const updated = await updateUser(u.id, {
      progress: { [QUEST_PROGRESS_KEY]: state },
    });
    res.json({
      ok: true,
      state: plainObject(updated?.progress)[QUEST_PROGRESS_KEY] || state,
    });
  } catch (e) {
    console.error('[quests:save] error:', e);
    res.status(500).json({ ok: false, error: 'Failed to save quest progress' });
  }
}

app.put('/api/account/quests', requireAuth(), saveQuestProgress);
app.post('/api/account/quests', requireAuth(), saveQuestProgress);

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
    const token = req.shopifyToken || req.customerToken || readCookie(req, 'shopify_token');
    const json = await shopifyGQL(query, { token });
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
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/forgot-password', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'forgot-password.html')));
app.get('/reset-password', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'reset-password.html')));
app.get('/products/:handle', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'product.html')));
app.get('/pawket-network/:slug', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'pawket-network-detail.html')));

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  // One-time DB connectivity check on startup
  (async () => {
    try {
      const ok = await pingDb();
      if (ok) console.log('[db] connection ok');
      else console.warn('[db] connection unavailable (check Postgres)');
    } catch (e) {
      console.warn('[db] connection unavailable (check Postgres)');
    }
  })();
});

export default app;
