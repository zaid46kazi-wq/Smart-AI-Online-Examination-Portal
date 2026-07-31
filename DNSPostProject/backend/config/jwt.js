/**
 * JWT Secret and Token Utility
 */
const jwt = require('jsonwebtoken');

// SECURITY: JWT secret MUST be set via environment variable — never fall back to a known value
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET environment variable is not set. Server cannot start securely.');
    console.error('  → Set JWT_SECRET in your .env file or environment variables.');
    process.exit(1);
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

module.exports = { JWT_SECRET, generateToken, verifyToken };
