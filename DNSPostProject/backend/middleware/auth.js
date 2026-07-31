/**
 * JWT Authentication & RBAC Middleware
 */
const { verifyToken } = require('../config/jwt');
const { queryOne } = require('../config/db');

async function authenticate(req, res, next, requiredRole = null) {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        if (req.originalUrl.startsWith('/api')) return res.status(401).json({ error: 'Unauthorized: No token provided' });
        return res.redirect('/login');
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        if (req.originalUrl.startsWith('/api')) return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
        return res.redirect('/login');
    }

    try {
        const user = await queryOne('SELECT id, username, role, name, usn, email FROM students WHERE id = ?', [decoded.id]);
        if (!user) {
            if (req.originalUrl.startsWith('/api')) return res.status(401).json({ error: 'User not found' });
            return res.redirect('/login');
        }

        if (requiredRole && user.role !== requiredRole) {
            if (req.originalUrl.startsWith('/api')) return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
            return res.redirect('/login');
        }

        req.userId = user.id;
        req.userName = user.username;
        req.userRole = user.role;
        req.userFullName = user.name || user.username;
        req.userEmail = user.email || '';
        req.userUSN = user.usn || '';
        next();
    } catch (err) {
        console.error('[AUTH ERROR]', err.message);
        if (req.originalUrl.startsWith('/api')) return res.status(500).json({ error: 'Internal authentication error' });
        return res.redirect('/login');
    }
}

const requireAuth = (req, res, next) => authenticate(req, res, next);
const requireAdmin = (req, res, next) => authenticate(req, res, next, 'Admin');
const requireStudent = (req, res, next) => authenticate(req, res, next, 'Student');

const checkStudent = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    authenticate(req, res, next, 'Student');
};

const checkAdminPage = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    authenticate(req, res, next, 'Admin');
};

module.exports = { requireAuth, requireAdmin, requireStudent, checkStudent, checkAdminPage };
