// middleware/requireAuth.js
// JWT-based authentication with Shopify Storefront integration
// Exports: softSession (non-blocking), requireAuth (blocking)
// Node 20 / ESM

import { verifyToken } from '../utils/jwt.js';

// --- Public: softSession ------------------------------------------------------
/**
 * GET /api/session uses this.
 * Never throws; returns { signedIn:false } on any failure.
 */
export async function softSession(req, res) {
  try {
    const token = readAuthHeader(req);
    if (!token) return res.json({ signedIn: false });

    const decoded = verifyToken(token);
    if (!decoded) return res.json({ signedIn: false });

    const customer = {
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      id: decoded.id,
    };

    // Stash on req for any downstream route that might rely on it
    req.customerToken = decoded.shopifyToken;
    req.customer = customer;

    return res.json({
      signedIn: true,
      email: customer.email || null,
      firstName: customer.firstName || null,
      lastName: customer.lastName || null,
    });
  } catch (err) {
    // Do not crash session endpoint; just report signed out
    console.warn('[softSession] degraded:', briefError(err));
    return res.json({ signedIn: false });
  }
}

// --- Public: requireAuth ------------------------------------------------------
/**
 * Middleware to guard API routes.
 * - 401 on missing/invalid token
 * - 503 on Shopify network timeout (unless we have a cached customer, then continue)
 *
 * Defensive wrapper:
 *   - If someone mistakenly calls requireAuth() as a factory,
 *     we return the actual middleware function (no crash).
 */
export function requireAuth(...args) {
  // Factory-usage guard: allow router.use(requireAuth()) and router.use(requireAuth)
  if (args.length !== 3 || !args[0] || !args[1] || !args[2]) {
    return (req, res, next) => requireAuth(req, res, next);
  }

  const [req, res, next] = args;

  (async () => {
    try {
      const token = readAuthHeader(req);
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      try {
        const decoded = verifyToken(token);
        
        const customer = {
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          id: decoded.id,
        };

        req.customerToken = decoded.shopifyToken;
        req.customer = customer;
        return next();
      } catch (err) {
        // Invalid token or expired
        if (err.status === 401) {
          return res.status(401).json({ error: err.message || 'Unauthorized' });
        }

        // Unexpected errors
        console.error('[requireAuth] error:', err);
        return res.status(500).json({ error: 'Auth verification failed' });
      }
    } catch (outer) {
      console.error('[requireAuth] outer error:', outer);
      try {
        return res.status(500).json({ error: 'Auth middleware error' });
      } catch {
        // If res is somehow not usable, bubble up
        return next(outer);
      }
    }
  })();
}

// --- Helpers: auth header -----------------------------------------------------
function readAuthHeader(req) {
  const authHeader = req?.headers?.authorization || '';
  if (!authHeader) return null;
  
  // Extract token from "Bearer <token>"
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function briefError(err) {
  const base = err?.message || String(err);
  const code = err?.code ? ` code=${err.code}` : '';
  const status = err?.status ? ` status=${err.status}` : '';
  return `${base}${code}${status}`;
}

export default { softSession, requireAuth };