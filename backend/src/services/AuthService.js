const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const EmailService = require('./EmailService');

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'gep-scheduling-secret-key';
        this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
        this.bcryptRounds = 12;
    }

    /**
     * Register a new user with role-based validation
     */
    async register(userData) {
        try {
            const { email, password, firstName, lastName, role, partnerId, clientCompanyCode } = userData;

            // Validate email format
            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }

            // Check if user already exists
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .single();

            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            // Validate role-specific requirements
            await this.validateRoleRequirements(role, partnerId, clientCompanyCode);

            // Hash password
            const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

            // Generate email verification token
            const emailVerificationToken = crypto.randomBytes(32).toString('hex');

            // Create user record
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .insert([{
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    first_name: firstName,
                    last_name: lastName,
                    role,
                    partner_id: partnerId || null,
                    client_company_code: clientCompanyCode || null,
                    email_verification_token: emailVerificationToken,
                    is_active: true
                }])
                .select('id, email, first_name, last_name, role, created_at')
                .single();

            if (error) {
                logger.error('User registration failed:', error);
                throw new Error(`Registration failed: ${error.message}`);
            }

            // Send verification email
            await this.sendVerificationEmail(user.email, emailVerificationToken, user.first_name);

            logger.info(`User registered successfully: ${user.email} with role: ${role}`);

            return {
                user: this.sanitizeUser(user),
                message: 'Registration successful. Please check your email for verification instructions.'
            };

        } catch (error) {
            logger.error('Registration error:', error);
            throw error;
        }
    }

    /**
     * Authenticate user and generate JWT token
     */
    async login(email, password, ipAddress, userAgent) {
        try {
            // Get user with password hash
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select(`
                    id, email, password_hash, first_name, last_name, role, 
                    partner_id, client_company_code, is_active, email_verified,
                    partners(name, specialty, city),
                    clients(company_name)
                `)
                .eq('email', email.toLowerCase())
                .single();

            if (error || !user) {
                throw new Error('Invalid email or password');
            }

            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is deactivated. Please contact administrator.');
            }

            // Verify password
            const passwordValid = await bcrypt.compare(password, user.password_hash);
            if (!passwordValid) {
                throw new Error('Invalid email or password');
            }

            // Check email verification for production
            if (process.env.NODE_ENV === 'production' && !user.email_verified) {
                throw new Error('Please verify your email before logging in');
            }

            // Update last login timestamp
            await supabaseAdmin
                .from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', user.id);

            // Generate JWT token
            const token = this.generateToken(user);

            // Log successful login
            logger.info(`User logged in: ${user.email}`, {
                userId: user.id,
                role: user.role,
                ipAddress,
                userAgent
            });

            return {
                token,
                user: this.sanitizeUser(user),
                expiresIn: this.jwtExpiration
            };

        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Verify JWT token and return user data
     */
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Get fresh user data
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select(`
                    id, email, first_name, last_name, role, 
                    partner_id, client_company_code, is_active,
                    partners(name, specialty),
                    clients(company_name)
                `)
                .eq('id', decoded.userId)
                .single();

            if (error || !user || !user.is_active) {
                throw new Error('Invalid or expired token');
            }

            return this.sanitizeUser(user);

        } catch (error) {
            logger.error('Token verification error:', error);
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Refresh JWT token
     */
    async refreshToken(oldToken) {
        try {
            const decoded = jwt.verify(oldToken, this.jwtSecret, { ignoreExpiration: true });
            
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('id, email, role, is_active')
                .eq('id', decoded.userId)
                .single();

            if (!user || !user.is_active) {
                throw new Error('Invalid user for token refresh');
            }

            const newToken = this.generateToken(user);
            
            return {
                token: newToken,
                expiresIn: this.jwtExpiration
            };

        } catch (error) {
            logger.error('Token refresh error:', error);
            throw new Error('Token refresh failed');
        }
    }

    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Get current password hash
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('password_hash')
                .eq('id', userId)
                .single();

            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!passwordValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

            // Update password
            const { error } = await supabaseAdmin
                .from('users')
                .update({ password_hash: newPasswordHash })
                .eq('id', userId);

            if (error) {
                throw new Error('Password update failed');
            }

            logger.info(`Password changed for user: ${userId}`);
            return { message: 'Password updated successfully' };

        } catch (error) {
            logger.error('Password change error:', error);
            throw error;
        }
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        try {
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('id, first_name, is_active')
                .eq('email', email.toLowerCase())
                .single();

            if (!user || !user.is_active) {
                // Don't reveal if user exists for security
                return { message: 'If the email exists, a reset link will be sent.' };
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpires = new Date(Date.now() + 3600000); // 1 hour

            // Store reset token
            await supabaseAdmin
                .from('users')
                .update({
                    password_reset_token: resetToken,
                    password_reset_expires: resetExpires.toISOString()
                })
                .eq('id', user.id);

            // Send reset email
            await this.sendPasswordResetEmail(email, resetToken, user.first_name);

            logger.info(`Password reset requested for: ${email}`);
            return { message: 'If the email exists, a reset link will be sent.' };

        } catch (error) {
            logger.error('Password reset request error:', error);
            throw new Error('Password reset request failed');
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        try {
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('id, password_reset_expires')
                .eq('password_reset_token', token)
                .single();

            if (!user) {
                throw new Error('Invalid or expired reset token');
            }

            // Check if token is expired
            if (new Date() > new Date(user.password_reset_expires)) {
                throw new Error('Reset token has expired');
            }

            // Hash new password
            const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

            // Update password and clear reset token
            const { error } = await supabaseAdmin
                .from('users')
                .update({
                    password_hash: passwordHash,
                    password_reset_token: null,
                    password_reset_expires: null
                })
                .eq('id', user.id);

            if (error) {
                throw new Error('Password reset failed');
            }

            logger.info(`Password reset completed for user: ${user.id}`);
            return { message: 'Password reset successful' };

        } catch (error) {
            logger.error('Password reset error:', error);
            throw error;
        }
    }

    /**
     * Verify email address
     */
    async verifyEmail(token) {
        try {
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('id, email')
                .eq('email_verification_token', token)
                .single();

            if (!user) {
                throw new Error('Invalid verification token');
            }

            // Mark email as verified
            const { error } = await supabaseAdmin
                .from('users')
                .update({
                    email_verified: true,
                    email_verification_token: null
                })
                .eq('id', user.id);

            if (error) {
                throw new Error('Email verification failed');
            }

            logger.info(`Email verified for user: ${user.email}`);
            return { message: 'Email verified successfully' };

        } catch (error) {
            logger.error('Email verification error:', error);
            throw error;
        }
    }

    /**
     * Check if user has specific permission
     */
    async hasPermission(userId, permission, resourceType = null, resourceId = null) {
        try {
            // Get user role
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (!user) {
                return false;
            }

            // Admin has all permissions
            if (user.role === 'admin') {
                return true;
            }

            // Check specific permissions
            const { data: permissions } = await supabaseAdmin
                .from('user_permissions')
                .select('*')
                .eq('user_id', userId)
                .eq('permission_name', permission)
                .eq('is_active', true)
                .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

            if (!permissions || permissions.length === 0) {
                return this.hasRolePermission(user.role, permission);
            }

            // Check resource-specific permissions
            if (resourceType && resourceId) {
                return permissions.some(p => 
                    p.resource_type === resourceType && p.resource_id === resourceId
                );
            }

            return permissions.length > 0;

        } catch (error) {
            logger.error('Permission check error:', error);
            return false;
        }
    }

    /**
     * Generate JWT token for user
     */
    generateToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            partnerId: user.partner_id,
            clientCompanyCode: user.client_company_code
        };

        return jwt.sign(payload, this.jwtSecret, { 
            expiresIn: this.jwtExpiration,
            issuer: 'gep-scheduling-system',
            audience: 'gep-users'
        });
    }

    /**
     * Remove sensitive data from user object
     */
    sanitizeUser(user) {
        const { password_hash, password_reset_token, email_verification_token, ...sanitized } = user;
        return sanitized;
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate role-specific requirements
     */
    async validateRoleRequirements(role, partnerId, clientCompanyCode) {
        if (role === 'partner') {
            if (!partnerId) {
                throw new Error('Partner ID is required for partner role');
            }
            
            // Verify partner exists
            const { data: partner } = await supabaseAdmin
                .from('partners')
                .select('id')
                .eq('id', partnerId)
                .single();

            if (!partner) {
                throw new Error('Invalid partner ID');
            }
        }

        if (role === 'client') {
            if (!clientCompanyCode) {
                throw new Error('Client company code is required for client role');
            }
            
            // Verify client exists
            const { data: client } = await supabaseAdmin
                .from('clients')
                .select('company_code')
                .eq('company_code', clientCompanyCode)
                .single();

            if (!client) {
                throw new Error('Invalid client company code');
            }
        }
    }

    /**
     * Check role-based permissions
     */
    hasRolePermission(role, permission) {
        const rolePermissions = {
            'admin': ['*'], // Admin has all permissions
            'manager': [
                'view_schedules', 'create_schedules', 'approve_schedules',
                'manage_partners', 'view_analytics', 'export_data',
                'manage_assignments', 'view_audit_log'
            ],
            'partner': [
                'view_own_schedules', 'update_own_schedules', 'submit_schedules',
                'request_changes', 'view_own_assignments'
            ],
            'client': [
                'view_own_schedules', 'view_own_installations', 'request_changes'
            ]
        };

        const permissions = rolePermissions[role] || [];
        return permissions.includes('*') || permissions.includes(permission);
    }

    /**
     * Send email verification
     */
    async sendVerificationEmail(email, token, firstName) {
        try {
            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
            
            await EmailService.sendEmail({
                to: email,
                subject: 'GEP Scheduling - Verify Your Email',
                template: 'email_verification',
                data: {
                    firstName,
                    verificationUrl
                }
            });

        } catch (error) {
            logger.error('Failed to send verification email:', error);
            // Don't throw error - registration should succeed even if email fails
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, token, firstName) {
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
            
            await EmailService.sendEmail({
                to: email,
                subject: 'GEP Scheduling - Password Reset',
                template: 'password_reset',
                data: {
                    firstName,
                    resetUrl
                }
            });

        } catch (error) {
            logger.error('Failed to send password reset email:', error);
            // Don't throw error - reset should be logged even if email fails
        }
    }
}

module.exports = new AuthService();