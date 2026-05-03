// public/loopState.js — shared Loop availability cache (user-facing)
import { getSession } from './auth.js';

let cache = null;
let cacheAt = 0;
const TTL_MS = 60 * 1000;

function computeAvailability(summary) {
  const sent = Array.isArray(summary?.sentTokens) ? summary.sentTokens : [];
  const pending = summary?.pendingToken?.code;
  const available = sent.length > 0 || !!pending;
  return { ok: true, available, summary };
}

export function setLoopSummary(summary) {
  if (!summary) return;
  cache = computeAvailability(summary);
  cacheAt = Date.now();
  try { window.__ppLoopSummary = summary; } catch {}
  try {
    document.dispatchEvent(new CustomEvent('pp:loop:summary', { detail: cache }));
  } catch {}
}

export async function getLoopAvailability({ force = false } = {}) {
  if (!force && cache && (Date.now() - cacheAt) < TTL_MS) {
    return cache;
  }
  if (window.__ppLoopSummary) {
    setLoopSummary(window.__ppLoopSummary);
    return cache;
  }

  try {
    const session = await getSession();
    if (!session?.signedIn) {
      cache = { ok: false, available: false, summary: null };
      cacheAt = Date.now();
      return cache;
    }
    const res = await fetch('/api/loop/me', { credentials: 'include', cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      setLoopSummary(data);
      return cache;
    }
  } catch {}

  cache = { ok: false, available: false, summary: null };
  cacheAt = Date.now();
  return cache;
}
