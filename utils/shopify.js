// utils/shopify.js — Reconciled superset (robust storefront fetch w/ timeout, retry, caching, structured errors)
// Combines minimal version you had with richer capabilities:
//  - Timeout + retry (network + selected 5xx/429)
//  - Exponential backoff with jitter
//  - Optional small in-memory cache for idempotent queries (SHOPIFY_CACHE_MS)
//  - Structured errors (status, retryable, graphqlErrors)
//  - Debug logging (SHOPIFY_DEBUG=true)
//  - justData option if you want raw .data only
//  - Distinguishes auth/config errors early
//
// ENV:
//   SHOPIFY_STOREFRONT_DOMAIN (required)
//   SHOPIFY_STOREFRONT_TOKEN  (required or warnings)
//   SHOPIFY_API_VERSION        (default 2024-07)
//   SHOPIFY_TIMEOUT_MS         (default 7000)
//   SHOPIFY_RETRIES            (default 2)
//   SHOPIFY_CACHE_MS           (default 0 disabled) e.g. 30000 => 30s
//   SHOPIFY_DEBUG              set "true" for verbose logs
//
// Usage:
//   const data = await storefrontFetch(`query { shop { name } }`, {}, { justData:true });
//   const full = await storefrontFetch(queryString, vars, { timeoutMs: 5000, retries:3 });
//
// Returned shape (unless justData):
//   {
//     ok: boolean,
//     status: number (HTTP),
//     attempt: number,
//     data: { ... } | undefined,
//     errors: [...graphQLErrors] | undefined
//   }
// Throws only on transport / fatal config errors unless opts.throwOnGraphQLErrors = true
//
// Note: For write mutations or queries with sensitive data consider disabling cache (default off).

const SF_DOMAIN  = process.env.SHOPIFY_STOREFRONT_DOMAIN || process.env.SHOPIFY_DOMAIN || 'yx0ksi-xv.myshopify.com';
const SF_VERSION = process.env.SHOPIFY_API_VERSION || '2024-07';
const SF_TOKEN   = process.env.SHOPIFY_STOREFRONT_TOKEN;

const DEFAULT_TIMEOUT_MS = parseInt(process.env.SHOPIFY_TIMEOUT_MS || '7000', 10);
const DEFAULT_RETRIES    = parseInt(process.env.SHOPIFY_RETRIES || '2', 10);
const CACHE_MS           = parseInt(process.env.SHOPIFY_CACHE_MS || '0', 10); // 0 => disabled
const DEBUG              = String(process.env.SHOPIFY_DEBUG || '').toLowerCase() === 'true';

if (!SF_TOKEN) {
  console.warn('[shopify] Missing SHOPIFY_STOREFRONT_TOKEN — calls will fail with auth error.');
}

// Basic in-memory cache (query+variables string key)
const _cache = new Map();
/**
 * @param {string} key
 * @returns {object|null}
 */
function cacheGet(key) {
  if (!CACHE_MS) return null;
  const entry = _cache.get(key);
  if (!entry) return null;
  if ((Date.now() - entry.ts) > CACHE_MS) {
    _cache.delete(key);
    return null;
  }
  return entry.val;
}
function cacheSet(key, val) {
  if (!CACHE_MS) return;
  _cache.set(key, { ts: Date.now(), val });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Determine if an error is retryable.
 * @param {Error|any} err
 * @param {number} status
 */
function isRetryable(err, status) {
  if (err?.name === 'AbortError') return true;
  if (err?.code === 'ETIMEDOUT') return true;
  if (status === 429) return true;
  // Retry 5xx except unusual not-implemented/HTTP version unsupported
  if (status >= 500 && status !== 501 && status !== 505) return true;
  return false;
}

function jitter(base) {
  // +/- 30% jitter
  const delta = base * 0.3;
  return base + (Math.random() * delta * 2 - delta);
}

function buildUrl() {
  return `https://${SF_DOMAIN}/api/${SF_VERSION}/graphql.json`;
}

function log(...args) {
  if (DEBUG) console.log('[shopify]', ...args);
}

function warn(...args) {
  console.warn('[shopify]', ...args);
}

/**
 * Internal fetch with abort.
 */
async function _doFetch(body, { timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(buildUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Shopify-Storefront-Access-Token': SF_TOKEN || '',
      },
      body,
      signal: controller.signal,
    });
    const status = res.status;
    const text = await res.text().catch(() => '');
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {
      json = null;
    }
    return { res, status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * storefrontFetch(query, variables?, options?)
 * Returns either full structured object or data only if justData=true.
 * Will not throw on GraphQL errors unless throwOnGraphQLErrors=true.
 * Throws on transport errors, auth/config errors, or permanent failures after retries.
 */
export async function storefrontFetch(
  query,
  variables = {},
  opts = {}
) {
  if (!SF_DOMAIN) {
    throw new Error('Storefront domain missing (SHOPIFY_STOREFRONT_DOMAIN or SHOPIFY_DOMAIN)');
  }
  if (!SF_TOKEN) {
    const e = new Error('Storefront token missing (SHOPIFY_STOREFRONT_TOKEN)');
    e.status = 401;
    throw e;
  }

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    justData = false,
    throwOnGraphQLErrors = false,
    cache = true,          // allow disabling cache per-call
    keyOverride = null,    // override cache key if desired
  } = opts;

  // Normalize query (allow object with { query, variables })
  if (query && typeof query === 'object' && query.query) {
    variables = query.variables || variables;
    query = query.query;
  }
  const bodyObj = { query, variables };
  const body = JSON.stringify(bodyObj);

  const cacheKey = keyOverride || `${query}::${JSON.stringify(variables)}`;
  if (cache && CACHE_MS > 0) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      log('cache hit', cacheKey);
      return justData ? cached.data : cached;
    }
  }

  let attempt = 0;
  while (true) {
    let meta;
    try {
      meta = await _doFetch(body, { timeoutMs });
    } catch (transportErr) {
      const retryable = isRetryable(transportErr, transportErr?.status || 0);
      if (retryable && attempt < retries) {
        attempt++;
        const delay = jitter(300 * Math.pow(2, attempt)); // 600ms, 1200ms, etc (jittered)
        log('retry transport', attempt, 'delay', Math.round(delay));
        await sleep(delay);
        continue;
      }
      transportErr.attempt = attempt;
      throw transportErr;
    }

    const { status, json, text } = meta;

    if (status < 200 || status >= 300) {
      const retryable = isRetryable(null, status);
      if (retryable && attempt < retries) {
        attempt++;
        const delay = jitter(300 * Math.pow(2, attempt));
        log('retry status', status, 'attempt', attempt, 'delay', Math.round(delay));
        await sleep(delay);
        continue;
      }
      const err = new Error(`[shopify] HTTP ${status}: ${text.slice(0, 300)}`);
      err.status = status;
      err.body = text;
      err.retryable = retryable;
      err.attempt = attempt;
      throw err;
    }

    // json may be null if empty body
    const gqlErrors = json?.errors;
    const data = json?.data;

    const payload = {
      ok: !gqlErrors,
      status,
      attempt,
      data,
      errors: gqlErrors
    };

    if (gqlErrors) {
      log('graphql errors', gqlErrors);
      if (throwOnGraphQLErrors) {
        const err = new Error('[shopify] GraphQL errors');
        err.status = status;
        err.graphqlErrors = gqlErrors;
        err.attempt = attempt;
        throw err;
      }
    }

    if (cache && CACHE_MS > 0 && payload.ok) {
      cacheSet(cacheKey, payload);
    }

    return justData ? data : payload;
  }
}

/**
 * Convenience helper: fetchData(query, variables?, opts?)
 * Always returns data or throws.
 */
export async function fetchData(query, variables = {}, opts = {}) {
  const result = await storefrontFetch(query, variables, { ...opts, justData: false });
  if (!result.ok) {
    const err = new Error('GraphQL returned errors');
    err.graphqlErrors = result.errors;
    err.data = result.data;
    throw err;
  }
  return result.data;
}

/**
 * Clears internal cache (for test / admin).
 */
export function clearShopifyCache() {
  _cache.clear();
}

/**
 * Returns basic health diagnostics.
 */
export function shopifyHealth() {
  return {
    domain: SF_DOMAIN,
    version: SF_VERSION,
    tokenPresent: !!SF_TOKEN,
    cacheEnabled: CACHE_MS > 0,
    cacheSize: _cache.size,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
  };
}

export default {
  storefrontFetch,
  fetchData,
  clearShopifyCache,
  shopifyHealth
};