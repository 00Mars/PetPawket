// utils/jwt.js - JWT utilities for authentication
import jwt from 'jsonwebtoken';

// Get JWT secret from environment or use a default for development
// In production, this MUST be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'petpawket-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Sign a JWT token with customer data
 * @param {Object} payload - Customer data to encode in the token
 * @returns {string} Signed JWT token
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const error = new Error('Token expired');
      error.status = 401;
      error.code = 'TOKEN_EXPIRED';
      throw error;
    }
    if (err.name === 'JsonWebTokenError') {
      const error = new Error('Invalid token');
      error.status = 401;
      error.code = 'INVALID_TOKEN';
      throw error;
    }
    throw err;
  }
}

export default { signToken, verifyToken };
