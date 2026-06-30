import express from 'express';
import crypto from 'node:crypto';
import {
  getUserByEmail,
  getUserById,
  getUserByIdWithPassword,
  updateUser,
  storePasswordResetToken,
  consumePasswordResetToken,
  revokePasswordResetTokensForUser,
} from '../userDB.pg.js';
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
  decodePasswordResetToken,
  hashPassword,
  verifyPassword
} from '../utils/auth.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createRateLimiter, ipAndFieldKey, ipKey } from '../middleware/rateLimit.js';

const router = express.Router();

function passwordResetTokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function configuredPublicBaseUrl(req, env = process.env) {
  const raw = env.PUBLIC_SITE_URL || env.PETPAWKET_PUBLIC_URL || env.APP_BASE_URL || env.SITE_URL || '';
  if (raw) {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('PUBLIC_SITE_URL_PROTOCOL_INVALID');
    return url.origin;
  }
  if (env.NODE_ENV === 'production') throw new Error('PUBLIC_SITE_URL_REQUIRED');
  return `${req.protocol}://${req.get('host')}`;
}

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  key: ipAndFieldKey('auth:forgot-password', 'email'),
  message: 'Too many password reset requests. Please try again soon.',
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  key: ipKey('auth:reset-password'),
  message: 'Too many password reset attempts. Please try again soon.',
});

const changePasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: ipKey('auth:change-password'),
  message: 'Too many password change attempts. Please try again soon.',
});

export function logPasswordResetForEnvironment(resetLink, env = process.env, logger = console) {
  if (env.NODE_ENV !== 'production') {
    logger.info('[forgot-password] reset link:', resetLink);
    return true;
  }
  logger.info('[forgot-password] reset requested for existing user');
  return false;
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always returns 200 (prevents user enumeration).
 * In development, logs the reset link; in production, you would email it.
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const rawEmail = (req.body?.email || '').toString().trim().toLowerCase();
    if (!rawEmail) {
      // Return generic 200 to avoid enumeration
      return res.status(200).json({ ok: true });
    }

    const user = await getUserByEmail(rawEmail);
    if (user?.id) {
      let baseUrl = '';
      try {
        baseUrl = configuredPublicBaseUrl(req);
      } catch (urlErr) {
        console.error('POST /forgot-password base URL error:', urlErr?.message || urlErr);
        return res.status(200).json({ ok: true });
      }

      const token = createPasswordResetToken(user, process.env.RESET_TOKEN_TTL || '15m');
      const decoded = decodePasswordResetToken(token);
      const expiresAt = decoded?.exp ? new Date(Number(decoded.exp) * 1000) : null;
      if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
        throw new Error('RESET_TOKEN_EXP_MISSING');
      }
      await storePasswordResetToken(user.id, passwordResetTokenHash(token), expiresAt);
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      // In non-production, we can include resetLink to simplify local testing
      if (process.env.NODE_ENV !== 'production') {
        logPasswordResetForEnvironment(resetLink);
        return res.status(200).json({ ok: true, resetLink });
      }

      logPasswordResetForEnvironment(resetLink);
    }

    // Always return ok:true
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('POST /forgot-password error:', e);
    // Still avoid user enumeration
    return res.status(200).json({ ok: true });
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 */
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const token = (req.body?.token || '').toString().trim();
    const newPassword = (req.body?.password || '').toString();

    if (!token || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Token and password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });
    }

    let decoded;
    try {
      decoded = verifyPasswordResetToken(token);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
    }
    if (!decoded?.id || !decoded?.email || decoded?.purpose !== 'pwreset') {
      return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
    }

    const user = await getUserById(decoded.id);
    if (!user || user.email.toLowerCase() !== decoded.email.toLowerCase()) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
    }

    let consumed = null;
    try {
      consumed = await consumePasswordResetToken(user.id, passwordResetTokenHash(token));
    } catch {
      consumed = null;
    }
    if (!consumed) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
    }
    const passwordHash = await hashPassword(newPassword);
    await updateUser(user.id, { passwordHash });
    await revokePasswordResetTokensForUser(user.id);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('POST /reset-password error:', e);
    return res.status(500).json({ ok: false, error: 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/change-password (JWT required)
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', changePasswordLimiter, requireAuth(), async (req, res) => {
  try {
    const currentPassword = (req.body?.currentPassword || '').toString();
    const newPassword = (req.body?.newPassword || '').toString();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters' });
    }

    let user = req.dbUser;
    if (!user?.passwordHash && user?.id) {
      user = await getUserByIdWithPassword(user.id);
    }
    if (!user?.passwordHash) {
      return res.status(400).json({ ok: false, error: 'No current password set; use reset password' });
    }

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ ok: false, error: 'Current password is incorrect' });
    }

    const passwordHash = await hashPassword(newPassword);
    await updateUser(user.id, { passwordHash });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('POST /change-password error:', e);
    return res.status(500).json({ ok: false, error: 'Failed to change password' });
  }
});

export default router;
