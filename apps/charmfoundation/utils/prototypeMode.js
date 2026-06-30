export function charmPrototypeModeEnabled(env = process.env) {
  return String(env.CHARM_FOUNDATION_PROTOTYPE_MODE ?? 'true').toLowerCase() !== 'false';
}

export function prototypeResponse(message, extra = {}) {
  return {
    ok: true,
    status: 'prototype_queued',
    prototype: true,
    placeholder: true,
    message,
    ...extra,
  };
}

export function sendPrototypeOrUnavailable(res, message, extra = {}) {
  if (charmPrototypeModeEnabled()) {
    return res.json(prototypeResponse(message, extra));
  }
  return res.status(503).json({
    ok: false,
    error: 'CHARM Foundation storage is not configured.',
  });
}
