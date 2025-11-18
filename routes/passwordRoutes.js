import express from 'express';
import { getUserByEmail, getUserById, updateUser } from '../userDB.pg.js';
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
  hashPassword,
  verifyPassword
} from '../utils/auth.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always returns 200 (prevents user enumeration).
 * In development, logs the reset link; in production, you would email it.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const rawEmail = (req.body?.email || '').toString().trim().toLowerCase();
    if (!rawEmail) {
      // Return generic 200 to avoid enumeration
      return res.status(200).json({ ok: true });
    }

    const user = await getUserByEmail(rawEmail);
    if (user?.id) {
      const token = createPasswordResetToken(user, process.env.RESET_TOKEN_TTL || '15m');
      // Construct reset URL for your site
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      // In production, email the link using your SMTP provider.
      // For now: log so you can test without email setup.
      console.info('[forgot-password] reset link:', resetLink);

      // In non-production, we can include resetLink to simplify local testing
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({ ok: true, resetLink });
      }
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
router.post('/reset-password', async (req, res) => {
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

    const passwordHash = await hashPassword(newPassword);
    await updateUser(user.id, { passwordHash });

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
router.post('/change-password', requireAuth(), async (req, res) => {
  try {
    const currentPassword = (req.body?.currentPassword || '').toString();
    const newPassword = (req.body?.newPassword || '').toString();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters' });
    }

    const user = req.dbUser;
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