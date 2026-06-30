const buckets = new Map();

function nowMs() {
  return Date.now();
}

function purgeExpired(now = nowMs()) {
  for (const [key, bucket] of buckets.entries()) {
    if (!bucket?.resetAt || bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIp(req, env = process.env) {
  if (String(env.TRUST_PROXY_RATE_LIMIT_IPS || '').toLowerCase() === 'true') {
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

export function ipKey(scope) {
  return (req) => `${scope}:ip:${clientIp(req)}`;
}

export function ipAndFieldKey(scope, field) {
  return (req) => {
    const raw = req.body?.[field] ?? req.query?.[field] ?? '';
    const value = String(raw).trim().toLowerCase();
    return `${scope}:ip-field:${clientIp(req)}:${value || 'blank'}`;
  };
}

export function createRateLimiter({
  windowMs = 60_000,
  max = 60,
  key = ipKey('default'),
  message = 'Too many requests. Please try again soon.',
  code = 'RATE_LIMITED',
  skip = null,
} = {}) {
  const limit = Math.max(1, Number(max) || 1);
  const windowLength = Math.max(1_000, Number(windowMs) || 60_000);

  return function rateLimit(req, res, next) {
    if (typeof skip === 'function' && skip(req)) return next();

    const now = nowMs();
    if (buckets.size > 10_000 || Math.random() < 0.01) purgeExpired(now);

    const bucketKey = typeof key === 'function' ? key(req) : String(key || 'default');
    const existing = buckets.get(bucketKey);
    const bucket = existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowLength };

    bucket.count += 1;
    buckets.set(bucketKey, bucket);

    if (bucket.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ ok: false, error: message, code });
    }

    return next();
  };
}

export function __resetRateLimitForTests() {
  buckets.clear();
}
