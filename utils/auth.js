import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const DEFAULT_DEV_SECRET = 'supersecretkey';
const IS_PROD = process.env.NODE_ENV === 'production';
const SECRET = process.env.JWT_SECRET || (IS_PROD ? '' : DEFAULT_DEV_SECRET);

if (!SECRET || (IS_PROD && SECRET === DEFAULT_DEV_SECRET)) {
  throw new Error('JWT_SECRET is required in production.');
}

// Separate reset secret; falls back to JWT_SECRET for convenience
const RESET_SECRET = process.env.JWT_RESET_SECRET || SECRET;

/**
 * App session JWT
 */
export function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
}
export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/**
 * Password hashing
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password, hashed) {
  return bcrypt.compare(password, hashed);
}

/**
 * Password reset token (short-lived)
 * purpose: 'pwreset' guards against reusing tokens elsewhere.
 */
export function createPasswordResetToken(user, expiresIn = '15m') {
  return jwt.sign(
    { id: user.id, email: user.email, purpose: 'pwreset', jti: crypto.randomUUID() },
    RESET_SECRET,
    { expiresIn }
  );
}
export function verifyPasswordResetToken(token) {
  return jwt.verify(token, RESET_SECRET);
}
export function decodePasswordResetToken(token) {
  return jwt.decode(token);
}
