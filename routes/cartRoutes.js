import express from 'express';
import { storefrontFetch } from '../utils/shopify.js';

const router = express.Router();
router.use(express.json({ limit: '256kb' }));

function normalizeLines(lines = []) {
  return (Array.isArray(lines) ? lines : []).map((l) => {
    const merchandiseId = normalizeMerchandiseId(l?.merchandiseId || l?.variantId);
    const quantity = Math.max(1, Math.floor(Number(l?.quantity || 1)));
    if (merchandiseId) return { merchandiseId, quantity };
    return null;
  }).filter(Boolean);
}

function normalizeMerchandiseId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^gid:\/\/shopify\/ProductVariant\/\d+$/i.test(raw)) return raw;
  const productVariant = raw.match(/ProductVariant\/(\d+)/i);
  if (productVariant) return `gid://shopify/ProductVariant/${productVariant[1]}`;
  if (/^\d+$/.test(raw)) return `gid://shopify/ProductVariant/${raw}`;
  return '';
}

function hasInvalidLineShape(lines = []) {
  return !Array.isArray(lines) || lines.some((l) => {
    if (!l || typeof l !== 'object') return true;
    const merchandiseId = normalizeMerchandiseId(l.merchandiseId || l.variantId);
    const quantity = Number(l.quantity || 1);
    return !merchandiseId || !Number.isFinite(quantity) || quantity < 1;
  });
}

function normalizeAttributes(body = {}) {
  const attrs = [];
  const add = (key, value) => {
    const k = String(key || '').trim().slice(0, 80);
    const v = String(value || '').trim().slice(0, 300);
    if (k && v) attrs.push({ key: k, value: v });
  };

  if (Array.isArray(body.attributes)) {
    body.attributes.forEach((attr) => add(attr?.key, attr?.value));
  } else if (body.attributes && typeof body.attributes === 'object') {
    Object.entries(body.attributes).forEach(([key, value]) => add(key, value));
  }

  add('loop_token', body.loopToken);
  add('petpawket_source', body.source || 'cart_page');

  const seen = new Set();
  return attrs.filter((attr) => {
    const key = attr.key.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCartErrors(errors = []) {
  return (Array.isArray(errors) ? errors : []).map(e => ({
    field: e?.field || null,
    message: e?.message || 'Cart error',
    code: e?.code || null
  }));
}

async function handleCreate(req, res) {
  try {
    const rawLines = req.body?.lines;
    if (hasInvalidLineShape(rawLines)) {
      return res.status(400).json({ ok:false, error:'INVALID_CART_LINES' });
    }
    const lines = normalizeLines(rawLines);
    if (!lines.length) {
      return res.status(400).json({ ok:false, error:'EMPTY_CART' });
    }
    const attributes = normalizeAttributes(req.body);
    const input = { lines };
    if (attributes.length) input.attributes = attributes;

    const data = await storefrontFetch(/* GraphQL */`
      mutation CartCreate($input: CartInput) {
        cartCreate(input: $input) {
          cart { id checkoutUrl }
          userErrors { field message code }
        }
      }
    `, { input }, { timeoutMs: 7000, retries: 1, justData: true });

    const payload = data?.cartCreate;
    const url = payload?.cart?.checkoutUrl;
    if (!url) {
      return res.status(502).json({ ok:false, error:'CART_CREATE_FAILED', details: normalizeCartErrors(payload?.userErrors) });
    }
    res.json({ ok:true, checkoutUrl: url });
  } catch (e) {
    console.error('[cart/create] error:', e);
    res.status(502).json({ ok:false, error:'STORE_FRONT_ERROR' });
  }
}

router.post('/create', handleCreate);
router.post('/', handleCreate);

export default router;
