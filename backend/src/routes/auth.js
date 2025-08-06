const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthService = require('../services/AuthService');
const { authenticate, authorize, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        error: 'Too many authentication attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 password reset requests per hour
    message: {
        error: 'Too many password reset attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});

// Input validation middleware
const validateRegistration = (req, res, next) => {
    const { email, password, firstName, lastName, role } = req.body;
    
    if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({
            error: 'All fields are required: email, password, firstName, lastName, role',
            code: 'MISSING_REQUIRED_FIELDS'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long',
            code: 'WEAK_PASSWORD'
        });
    }

    if (!['partner', 'manager', 'admin', 'client'].includes(role)) {
        return res.status(400).json({
            error: 'Invalid role. Must be one of: partner, manager, admin, client',
            code: 'INVALID_ROLE'
        });
    }

    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            error: 'Email and password are required',
            code: 'MISSING_CREDENTIALS'
        });
    }

    next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public (but may be restricted by admin in production)
 */
router.post('/register', authLimiter, validateRegistration, auditLog('create', 'user'), async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role, partnerId, clientCompanyCode } = req.body;
        
        // In production, only admins should be able to create users
        if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SELF_REGISTRATION !== 'true') {
            return res.status(403).json({
                error: 'User registration is restricted. Please contact an administrator.',
                code: 'REGISTRATION_RESTRICTED'
            });
        }

        const result = await AuthService.register({
            email,
            password,
            firstName,
            lastName,
            role,
            partnerId,
            clientCompanyCode
        });

        res.status(201).json({
            success: true,
            message: result.message,
            user: result.user
        });

    } catch (error) {
        logger.error('Registration failed:', error);
        
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                error: error.message,
                code: 'USER_EXISTS'
            });
        }

        if (error.message.includes('Invalid')) {
            return res.status(400).json({
                error: error.message,
                code: 'VALIDATION_ERROR'
            });
        }

        next(error);
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', authLimiter, validateLogin, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.get('User-Agent');

        const result = await AuthService.login(email, password, ipAddress, userAgent);

        res.json({
            success: true,
            message: 'Login successful',
            token: result.token,
            user: result.user,
            expiresIn: result.expiresIn
        });

    } catch (error) {
        logger.error('Login failed:', error);
        
        // Don't reveal specific error details for security
        res.status(401).json({
            error: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
        });
    }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authLimiter, authenticate, async (req, res, next) => {
    try {
        const oldToken = req.headers.authorization.substring(7);
        const result = await AuthService.refreshToken(oldToken);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            token: result.token,
            expiresIn: result.expiresIn
        });

    } catch (error) {
        logger.error('Token refresh failed:', error);
        
        res.status(401).json({
            error: 'Token refresh failed',
            code: 'REFRESH_FAILED'
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, auditLog('update', 'user'), async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Current password and new password are required',
                code: 'MISSING_PASSWORDS'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'New password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }

        const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        logger.error('Password change failed:', error);
        
        if (error.message.includes('incorrect')) {
            return res.status(400).json({
                error: error.message,
                code: 'INCORRECT_PASSWORD'
            });
        }

        next(error);
    }
});

/**
 * @route   POST /api/auth/request-password-reset
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/request-password-reset', passwordResetLimiter, async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                error: 'Email is required',
                code: 'MISSING_EMAIL'
            });
        }

        const result = await AuthService.requestPasswordReset(email);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        logger.error('Password reset request failed:', error);
        next(error);
    }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authLimiter, async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({
                error: 'Reset token and new password are required',
                code: 'MISSING_RESET_DATA'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'New password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }

        const result = await AuthService.resetPassword(token, newPassword);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        logger.error('Password reset failed:', error);
        
        if (error.message.includes('Invalid') || error.message.includes('expired')) {
            return res.status(400).json({
                error: error.message,
                code: 'INVALID_RESET_TOKEN'
            });
        }

        next(error);
    }
});

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email/:token', async (req, res, next) => {
    try {
        const { token } = req.params;
        
        const result = await AuthService.verifyEmail(token);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        logger.error('Email verification failed:', error);
        
        res.status(400).json({
            error: error.message,
            code: 'VERIFICATION_FAILED'
        });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
    // With JWT, logout is typically handled client-side by removing the token
    // However, we can log the logout event
    logger.info(`User logged out: ${req.user.email}`, {
        userId: req.user.id,
        timestamp: new Date().toISOString()
    });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (admin only)
 * @access  Private - Admin only
 */
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { supabaseAdmin } = require('../config/supabase');
        
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select(`
                id, email, first_name, last_name, role, 
                partner_id, client_company_code, is_active, 
                email_verified, created_at, last_login_at,
                partners(name, specialty),
                clients(company_name)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            users: users.map(user => AuthService.sanitizeUser(user))
        });

    } catch (error) {
        logger.error('Failed to fetch users:', error);
        next(error);
    }
});

/**
 * @route   PUT /api/auth/users/:userId/status
 * @desc    Update user status (activate/deactivate)
 * @access  Private - Admin only
 */
router.put('/users/:userId/status', authenticate, authorize('admin'), auditLog('update', 'user'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;
        
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                error: 'isActive must be a boolean value',
                code: 'INVALID_STATUS'
            });
        }

        const { supabaseAdmin } = require('../config/supabase');
        
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({ is_active: isActive })
            .eq('id', userId)
            .select('id, email, is_active')
            .single();

        if (error) {
            throw error;
        }

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        logger.info(`User status updated: ${user.email} -> ${isActive ? 'active' : 'inactive'}`, {
            userId: user.id,
            updatedBy: req.user.id
        });

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: AuthService.sanitizeUser(user)
        });

    } catch (error) {
        logger.error('Failed to update user status:', error);
        next(error);
    }
});

/**
 * @route   DELETE /api/auth/users/:userId
 * @desc    Delete user account (admin only)
 * @access  Private - Admin only
 */
router.delete('/users/:userId', authenticate, authorize('admin'), auditLog('delete', 'user'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        // Prevent admin from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({
                error: 'Cannot delete your own account',
                code: 'SELF_DELETE_FORBIDDEN'
            });
        }

        const { supabaseAdmin } = require('../config/supabase');
        
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId)
            .select('id, email')
            .single();

        if (error) {
            throw error;
        }

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        logger.info(`User deleted: ${user.email}`, {
            deletedUserId: user.id,
            deletedBy: req.user.id
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        logger.error('Failed to delete user:', error);
        next(error);
    }
});

module.exports = router;