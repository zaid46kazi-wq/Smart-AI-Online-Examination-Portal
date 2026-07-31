/**
 * Auth Controller — JWT Login, Logout, Verification
 */
const userModel = require('../models/userModel');
const { generateToken } = require('../config/jwt');

const authController = {
    login: async (req, res, next) => {
        try {
            const { username, password, role } = req.body;
            let dbRole = 'Student';
            if (role.toLowerCase() === 'instructor' || role.toLowerCase() === 'admin') dbRole = 'Admin';

            const user = await userModel.findByUsernameOrEmail(username, dbRole);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const isValid = await userModel.verifyPassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = generateToken({
                id: user.id,
                username: user.username,
                role: user.role
            });

            const cookieSettings = {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000
            };

            res.cookie('token', token, cookieSettings);
            res.cookie('user', user.username, { httpOnly: false, maxAge: cookieSettings.maxAge });
            res.cookie('role', user.role, { httpOnly: false, maxAge: cookieSettings.maxAge });

            return res.json({
                success: true,
                token,
                role: user.role,
                username: user.username,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (err) {
            next(err);
        }
    },

    logout: async (req, res) => {
        res.clearCookie('token');
        res.clearCookie('user');
        res.clearCookie('role');
        return res.json({ success: true, message: 'Logged out successfully' });
    },

    me: async (req, res, next) => {
        try {
            const user = await userModel.findById(req.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });
            return res.json({ success: true, user });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = authController;
