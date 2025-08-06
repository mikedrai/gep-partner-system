const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');
const EmailService = require('./EmailService');
const WebSocketManager = require('./WebSocketManager');

/**
 * Comprehensive Notification System
 * Handles email notifications, dashboard alerts, real-time updates
 * Supports role-based notifications, preferences, and delivery tracking
 */
class NotificationService {
    constructor() {
        this.emailService = new EmailService();
        this.wsManager = new WebSocketManager();
        this.notificationQueue = [];
        this.batchSize = 10;
        this.batchInterval = 5000; // 5 seconds
        this.retryAttempts = 3;
        this.retryDelay = 30000; // 30 seconds
        
        // Notification templates
        this.templates = {
            schedule_created: {
                email: {
                    subject: 'Νέο Πρόγραμμα Επισκέψεων - {installationName}',
                    template: 'schedule_created_email.html'
                },
                dashboard: {
                    title: 'Νέο Πρόγραμμα',
                    message: 'Δημιουργήθηκε νέο πρόγραμμα επισκέψεων για {installationName}',
                    icon: 'calendar-plus',
                    color: 'success'
                }
            },
            schedule_updated: {
                email: {
                    subject: 'Ενημέρωση Προγράμματος - {installationName}',
                    template: 'schedule_updated_email.html'
                },
                dashboard: {
                    title: 'Ενημέρωση Προγράμματος',
                    message: 'Το πρόγραμμα για {installationName} ενημερώθηκε',
                    icon: 'calendar-edit',
                    color: 'info'
                }
            },
            visit_reminder: {
                email: {
                    subject: 'Υπενθύμιση Επίσκεψης - {installationName}',
                    template: 'visit_reminder_email.html'
                },
                dashboard: {
                    title: 'Υπενθύμιση Επίσκεψης',
                    message: 'Επίσκεψη στις {visitTime} στην εγκατάσταση {installationName}',
                    icon: 'clock',
                    color: 'warning'
                }
            },
            approval_request: {
                email: {
                    subject: 'Αίτημα Έγκρισης - {entityType}',
                    template: 'approval_request_email.html'
                },
                dashboard: {
                    title: 'Αίτημα Έγκρισης',
                    message: 'Νέο αίτημα έγκρισης για {entityType}',
                    icon: 'check-circle',
                    color: 'primary'
                }
            },
            approval_completed: {
                email: {
                    subject: 'Ολοκλήρωση Έγκρισης - {entityType}',
                    template: 'approval_completed_email.html'
                },
                dashboard: {
                    title: 'Έγκριση Ολοκληρώθηκε',
                    message: 'Η έγκριση για {entityType} ολοκληρώθηκε',
                    icon: 'check-all',
                    color: 'success'
                }
            },
            partner_assigned: {
                email: {
                    subject: 'Νέα Ανάθεση - {installationName}',
                    template: 'partner_assigned_email.html'
                },
                dashboard: {
                    title: 'Νέα Ανάθεση',
                    message: 'Ανατέθηκε η εγκατάσταση {installationName}',
                    icon: 'user-plus',
                    color: 'info'
                }
            },
            system_alert: {
                email: {
                    subject: 'Ειδοποίηση Συστήματος - {alertType}',
                    template: 'system_alert_email.html'
                },
                dashboard: {
                    title: 'Ειδοποίηση Συστήματος',
                    message: '{alertMessage}',
                    icon: 'alert-triangle',
                    color: 'danger'
                }
            },
            contract_expiring: {
                email: {
                    subject: 'Λήξη Σύμβασης - {contractCode}',
                    template: 'contract_expiring_email.html'
                },
                dashboard: {
                    title: 'Λήξη Σύμβασης',
                    message: 'Η σύμβαση {contractCode} λήγει σε {daysUntilExpiry} ημέρες',
                    icon: 'calendar-x',
                    color: 'warning'
                }
            }
        };

        // Start batch processing
        this.startBatchProcessing();
    }

    /**
     * Send notification to users
     */
    async sendNotification(type, recipients, data, options = {}) {
        try {
            const notificationId = this.generateNotificationId();
            
            logger.info(`Sending notification: ${type} to ${recipients.length} recipients`);

            // Validate notification type
            if (!this.templates[type]) {
                throw new Error(`Unknown notification type: ${type}`);
            }

            // Process recipients
            const processedRecipients = await this.processRecipients(recipients, type, data);

            // Create notification record
            const notification = {
                id: notificationId,
                type,
                data,
                recipients: processedRecipients,
                options: {
                    priority: options.priority || 'normal',
                    channels: options.channels || ['email', 'dashboard'],
                    scheduleFor: options.scheduleFor || null,
                    batchable: options.batchable !== false,
                    ...options
                },
                status: 'pending',
                createdAt: new Date().toISOString(),
                attempts: 0
            };

            // Store notification
            await this.storeNotification(notification);

            // Add to queue or send immediately
            if (options.immediate || options.priority === 'urgent') {
                await this.processNotification(notification);
            } else {
                this.notificationQueue.push(notification);
            }

            logger.info(`Notification ${notificationId} queued for processing`);
            return notificationId;

        } catch (error) {
            logger.error('Failed to send notification:', error);
            throw error;
        }
    }

    /**
     * Send schedule-related notifications
     */
    async sendScheduleNotification(scheduleId, type, additionalData = {}) {
        try {
            // Get schedule details
            const schedule = await this.getScheduleDetails(scheduleId);
            if (!schedule) {
                throw new Error(`Schedule not found: ${scheduleId}`);
            }

            // Determine recipients based on notification type
            const recipients = await this.getScheduleNotificationRecipients(schedule, type);

            // Prepare notification data
            const notificationData = {
                scheduleId: schedule.id,
                installationCode: schedule.installation_code,
                installationName: schedule.installation_name,
                partnerName: schedule.partner_name,
                serviceType: schedule.service_type,
                startDate: schedule.start_date,
                endDate: schedule.end_date,
                totalHours: schedule.total_hours,
                ...additionalData
            };

            // Send notification
            return await this.sendNotification(type, recipients, notificationData);

        } catch (error) {
            logger.error('Failed to send schedule notification:', error);
            throw error;
        }
    }

    /**
     * Send visit reminders
     */
    async sendVisitReminders(daysAhead = 1) {
        try {
            logger.info(`Sending visit reminders for ${daysAhead} day(s) ahead`);

            // Get upcoming visits
            const upcomingVisits = await this.getUpcomingVisits(daysAhead);

            if (upcomingVisits.length === 0) {
                logger.info('No upcoming visits found for reminders');
                return { sent: 0, failed: 0 };
            }

            let sent = 0;
            let failed = 0;

            // Send reminder for each visit
            for (const visit of upcomingVisits) {
                try {
                    // Check if reminder already sent
                    const reminderSent = await this.isReminderSent(visit.id, daysAhead);
                    if (reminderSent) {
                        continue;
                    }

                    // Get notification recipients
                    const recipients = await this.getVisitReminderRecipients(visit);

                    // Prepare notification data
                    const notificationData = {
                        visitId: visit.id,
                        visitDate: visit.visit_date,
                        visitTime: visit.start_time,
                        installationName: visit.installation_name,
                        installationAddress: visit.installation_address,
                        partnerName: visit.partner_name,
                        serviceType: visit.service_type,
                        duration: visit.duration_hours,
                        notes: visit.notes,
                        daysAhead
                    };

                    // Send reminder
                    await this.sendNotification('visit_reminder', recipients, notificationData, {
                        priority: 'high',
                        immediate: true
                    });

                    // Mark reminder as sent
                    await this.markReminderSent(visit.id, daysAhead);

                    sent++;

                } catch (error) {
                    logger.error(`Failed to send reminder for visit ${visit.id}:`, error);
                    failed++;
                }
            }

            logger.info(`Visit reminders completed: ${sent} sent, ${failed} failed`);
            return { sent, failed };

        } catch (error) {
            logger.error('Failed to send visit reminders:', error);
            throw error;
        }
    }

    /**
     * Send approval notifications
     */
    async sendApprovalNotification(workflowId, stepId, approvers, data) {
        try {
            // Get workflow details
            const workflow = await this.getWorkflowDetails(workflowId);
            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            // Prepare notification data
            const notificationData = {
                workflowId,
                stepId,
                entityType: workflow.entity_type,
                entityId: workflow.entity_id,
                stepName: data.stepName,
                initiatorName: data.initiatorName,
                urgency: data.urgency || 'normal',
                approvalUrl: `/dashboard/approvals/${workflowId}`,
                ...data
            };

            // Send to approvers
            return await this.sendNotification('approval_request', approvers, notificationData, {
                priority: 'high',
                immediate: true
            });

        } catch (error) {
            logger.error('Failed to send approval notification:', error);
            throw error;
        }
    }

    /**
     * Send system alerts
     */
    async sendSystemAlert(alertType, message, severity = 'warning', recipients = null) {
        try {
            // Get system alert recipients if not specified
            if (!recipients) {
                recipients = await this.getSystemAlertRecipients(severity);
            }

            const notificationData = {
                alertType,
                alertMessage: message,
                severity,
                timestamp: new Date().toISOString(),
                systemStatus: await this.getSystemStatus()
            };

            return await this.sendNotification('system_alert', recipients, notificationData, {
                priority: severity === 'critical' ? 'urgent' : 'high',
                immediate: severity === 'critical',
                channels: ['email', 'dashboard', 'websocket']
            });

        } catch (error) {
            logger.error('Failed to send system alert:', error);
            throw error;
        }
    }

    /**
     * Process notification (send via all channels)
     */
    async processNotification(notification) {
        try {
            notification.status = 'processing';
            notification.attempts++;
            notification.lastAttempt = new Date().toISOString();

            await this.updateNotification(notification);

            const template = this.templates[notification.type];
            const results = {
                email: { sent: 0, failed: 0 },
                dashboard: { sent: 0, failed: 0 },
                websocket: { sent: 0, failed: 0 }
            };

            // Send via enabled channels
            const channels = notification.options.channels || ['email', 'dashboard'];

            for (const channel of channels) {
                try {
                    switch (channel) {
                        case 'email':
                            if (template.email) {
                                const emailResult = await this.sendEmailNotifications(notification, template.email);
                                results.email = emailResult;
                            }
                            break;

                        case 'dashboard':
                            if (template.dashboard) {
                                const dashboardResult = await this.sendDashboardNotifications(notification, template.dashboard);
                                results.dashboard = dashboardResult;
                            }
                            break;

                        case 'websocket':
                            const wsResult = await this.sendWebSocketNotifications(notification, template.dashboard);
                            results.websocket = wsResult;
                            break;
                    }
                } catch (channelError) {
                    logger.error(`Failed to send ${channel} notification:`, channelError);
                }
            }

            // Update notification status
            const totalSent = Object.values(results).reduce((sum, result) => sum + result.sent, 0);
            const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failed, 0);

            if (totalSent > 0 && totalFailed === 0) {
                notification.status = 'sent';
            } else if (totalSent === 0) {
                notification.status = 'failed';
            } else {
                notification.status = 'partial';
            }

            notification.results = results;
            notification.completedAt = new Date().toISOString();

            await this.updateNotification(notification);

            logger.info(`Notification ${notification.id} processed: ${totalSent} sent, ${totalFailed} failed`);

        } catch (error) {
            logger.error(`Failed to process notification ${notification.id}:`, error);
            
            // Retry logic
            if (notification.attempts < this.retryAttempts) {
                notification.status = 'retry';
                notification.nextRetry = new Date(Date.now() + this.retryDelay).toISOString();
                await this.updateNotification(notification);
                
                // Schedule retry
                setTimeout(() => {
                    this.processNotification(notification);
                }, this.retryDelay);
            } else {
                notification.status = 'failed';
                notification.error = error.message;
                await this.updateNotification(notification);
            }
        }
    }

    /**
     * Send email notifications
     */
    async sendEmailNotifications(notification, emailTemplate) {
        try {
            let sent = 0;
            let failed = 0;

            for (const recipient of notification.recipients) {
                if (!recipient.email || !recipient.emailEnabled) {
                    continue;
                }

                try {
                    // Prepare email data
                    const emailData = {
                        to: recipient.email,
                        toName: recipient.name,
                        subject: this.interpolateTemplate(emailTemplate.subject, notification.data),
                        templateName: emailTemplate.template,
                        templateData: {
                            recipientName: recipient.name,
                            ...notification.data
                        }
                    };

                    // Send email
                    await this.emailService.sendTemplatedEmail(emailData);
                    sent++;

                } catch (error) {
                    logger.error(`Failed to send email to ${recipient.email}:`, error);
                    failed++;
                }
            }

            return { sent, failed };

        } catch (error) {
            logger.error('Failed to send email notifications:', error);
            return { sent: 0, failed: notification.recipients.length };
        }
    }

    /**
     * Send dashboard notifications
     */
    async sendDashboardNotifications(notification, dashboardTemplate) {
        try {
            let sent = 0;
            let failed = 0;

            for (const recipient of notification.recipients) {
                if (!recipient.dashboardEnabled) {
                    continue;
                }

                try {
                    // Create dashboard notification
                    const dashboardNotification = {
                        user_id: recipient.userId,
                        type: notification.type,
                        title: this.interpolateTemplate(dashboardTemplate.title, notification.data),
                        message: this.interpolateTemplate(dashboardTemplate.message, notification.data),
                        icon: dashboardTemplate.icon,
                        color: dashboardTemplate.color,
                        data: notification.data,
                        read: false,
                        created_at: new Date().toISOString()
                    };

                    // Store in database
                    await this.storeDashboardNotification(dashboardNotification);
                    sent++;

                } catch (error) {
                    logger.error(`Failed to send dashboard notification to user ${recipient.userId}:`, error);
                    failed++;
                }
            }

            return { sent, failed };

        } catch (error) {
            logger.error('Failed to send dashboard notifications:', error);
            return { sent: 0, failed: notification.recipients.length };
        }
    }

    /**
     * Send WebSocket notifications for real-time updates
     */
    async sendWebSocketNotifications(notification, template) {
        try {
            let sent = 0;
            let failed = 0;

            for (const recipient of notification.recipients) {
                if (!recipient.realtimeEnabled) {
                    continue;
                }

                try {
                    // Send WebSocket message
                    const wsMessage = {
                        type: 'notification',
                        notificationType: notification.type,
                        title: this.interpolateTemplate(template.title, notification.data),
                        message: this.interpolateTemplate(template.message, notification.data),
                        icon: template.icon,
                        color: template.color,
                        data: notification.data,
                        timestamp: new Date().toISOString()
                    };

                    await this.wsManager.sendToUser(recipient.userId, wsMessage);
                    sent++;

                } catch (error) {
                    logger.error(`Failed to send WebSocket notification to user ${recipient.userId}:`, error);
                    failed++;
                }
            }

            return { sent, failed };

        } catch (error) {
            logger.error('Failed to send WebSocket notifications:', error);
            return { sent: 0, failed: notification.recipients.length };
        }
    }

    /**
     * Get user notification preferences
     */
    async getUserNotificationPreferences(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_notification_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found error
                throw error;
            }

            // Return default preferences if not found
            return data || {
                user_id: userId,
                email_enabled: true,
                dashboard_enabled: true,
                realtime_enabled: true,
                visit_reminders: true,
                schedule_updates: true,
                approval_requests: true,
                system_alerts: true,
                frequency: 'immediate'
            };

        } catch (error) {
            logger.error('Failed to get user notification preferences:', error);
            // Return safe defaults
            return {
                user_id: userId,
                email_enabled: true,
                dashboard_enabled: true,
                realtime_enabled: false,
                visit_reminders: true,
                schedule_updates: true,
                approval_requests: true,
                system_alerts: false,
                frequency: 'immediate'
            };
        }
    }

    /**
     * Update user notification preferences
     */
    async updateUserNotificationPreferences(userId, preferences) {
        try {
            const { error } = await supabaseAdmin
                .from('user_notification_preferences')
                .upsert([{
                    user_id: userId,
                    ...preferences,
                    updated_at: new Date().toISOString()
                }]);

            if (error) {
                throw error;
            }

            logger.info(`Updated notification preferences for user ${userId}`);

        } catch (error) {
            logger.error('Failed to update notification preferences:', error);
            throw error;
        }
    }

    /**
     * Get user dashboard notifications
     */
    async getUserDashboardNotifications(userId, limit = 50, offset = 0) {
        try {
            const { data, error } = await supabaseAdmin
                .from('dashboard_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw error;
            }

            return data || [];

        } catch (error) {
            logger.error('Failed to get dashboard notifications:', error);
            throw error;
        }
    }

    /**
     * Mark dashboard notifications as read
     */
    async markNotificationsAsRead(userId, notificationIds = null) {
        try {
            let query = supabaseAdmin
                .from('dashboard_notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('user_id', userId);

            if (notificationIds && notificationIds.length > 0) {
                query = query.in('id', notificationIds);
            }

            const { error } = await query;

            if (error) {
                throw error;
            }

            logger.info(`Marked notifications as read for user ${userId}`);

        } catch (error) {
            logger.error('Failed to mark notifications as read:', error);
            throw error;
        }
    }

    /**
     * Start batch processing of notifications
     */
    startBatchProcessing() {
        setInterval(async () => {
            if (this.notificationQueue.length > 0) {
                await this.processBatch();
            }
        }, this.batchInterval);
    }

    /**
     * Process batch of notifications
     */
    async processBatch() {
        if (this.notificationQueue.length === 0) return;

        const batch = this.notificationQueue.splice(0, this.batchSize);
        
        logger.info(`Processing notification batch: ${batch.length} notifications`);

        // Process notifications in parallel
        const processingPromises = batch.map(notification => 
            this.processNotification(notification).catch(error => {
                logger.error(`Batch processing failed for notification ${notification.id}:`, error);
            })
        );

        await Promise.all(processingPromises);
    }

    // Helper methods
    async processRecipients(recipients, notificationType, data) {
        const processed = [];

        for (const recipient of recipients) {
            let recipientData;

            if (typeof recipient === 'string') {
                // User ID provided
                recipientData = await this.getUserDetails(recipient);
            } else if (recipient.userId) {
                // User object provided
                recipientData = recipient;
            } else {
                // Email-only recipient
                recipientData = {
                    userId: null,
                    email: recipient.email || recipient,
                    name: recipient.name || 'User'
                };
            }

            if (recipientData) {
                // Get notification preferences
                const preferences = recipientData.userId ? 
                    await this.getUserNotificationPreferences(recipientData.userId) : 
                    { email_enabled: true, dashboard_enabled: false, realtime_enabled: false };

                // Check if user wants this type of notification
                const typeEnabled = this.isNotificationTypeEnabled(notificationType, preferences);

                if (typeEnabled) {
                    processed.push({
                        userId: recipientData.userId,
                        email: recipientData.email,
                        name: recipientData.name,
                        role: recipientData.role,
                        emailEnabled: preferences.email_enabled && recipientData.email,
                        dashboardEnabled: preferences.dashboard_enabled && recipientData.userId,
                        realtimeEnabled: preferences.realtime_enabled && recipientData.userId
                    });
                }
            }
        }

        return processed;
    }

    interpolateTemplate(template, data) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isNotificationTypeEnabled(type, preferences) {
        const typeMapping = {
            'schedule_created': preferences.schedule_updates,
            'schedule_updated': preferences.schedule_updates,
            'visit_reminder': preferences.visit_reminders,
            'approval_request': preferences.approval_requests,
            'approval_completed': preferences.approval_requests,
            'system_alert': preferences.system_alerts
        };

        return typeMapping[type] !== false;
    }

    // Database operations (placeholder implementations)
    async storeNotification(notification) {
        const { error } = await supabaseAdmin
            .from('notifications_log')
            .insert([notification]);

        if (error) {
            throw error;
        }
    }

    async updateNotification(notification) {
        const { error } = await supabaseAdmin
            .from('notifications_log')
            .update(notification)
            .eq('id', notification.id);

        if (error) {
            throw error;
        }
    }

    async storeDashboardNotification(notification) {
        const { error } = await supabaseAdmin
            .from('dashboard_notifications')
            .insert([notification]);

        if (error) {
            throw error;
        }
    }

    // Placeholder methods for data retrieval
    async getUserDetails(userId) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, email, name, role')
            .eq('id', userId)
            .single();

        return error ? null : data;
    }

    async getScheduleDetails(scheduleId) {
        const { data, error } = await supabaseAdmin
            .from('schedules')
            .select(`
                *,
                installations(company_name),
                partners(name)
            `)
            .eq('id', scheduleId)
            .single();

        return error ? null : {
            ...data,
            installation_name: data.installations?.company_name,
            partner_name: data.partners?.name
        };
    }

    async getScheduleNotificationRecipients(schedule, type) {
        // Get relevant users based on schedule and notification type
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, email, name, role')
            .in('role', ['admin', 'manager'])
            .eq('is_active', true);

        return error ? [] : users.map(user => user.id);
    }

    async getUpcomingVisits(daysAhead) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysAhead);
        const dateStr = targetDate.toISOString().split('T')[0];

        const { data, error } = await supabaseAdmin
            .from('scheduled_visits')
            .select(`
                *,
                schedules!inner(
                    installation_code,
                    partner_id
                ),
                installations(company_name, address),
                partners(name)
            `)
            .eq('visit_date', dateStr)
            .eq('status', 'scheduled');

        return error ? [] : data.map(visit => ({
            ...visit,
            installation_name: visit.installations?.company_name,
            installation_address: visit.installations?.address,
            partner_name: visit.partners?.name
        }));
    }

    async getVisitReminderRecipients(visit) {
        // Get partner and relevant managers
        const recipients = [];

        // Add partner
        if (visit.partner_id) {
            const { data: partner } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('partner_id', visit.partner_id)
                .eq('role', 'partner')
                .single();

            if (partner) {
                recipients.push(partner.id);
            }
        }

        // Add managers
        const { data: managers } = await supabaseAdmin
            .from('users')
            .select('id')
            .in('role', ['manager', 'admin'])
            .eq('is_active', true);

        if (managers) {
            recipients.push(...managers.map(m => m.id));
        }

        return recipients;
    }

    async isReminderSent(visitId, daysAhead) {
        const { data, error } = await supabaseAdmin
            .from('visit_reminders_sent')
            .select('id')
            .eq('visit_id', visitId)
            .eq('days_ahead', daysAhead)
            .single();

        return !error && data;
    }

    async markReminderSent(visitId, daysAhead) {
        await supabaseAdmin
            .from('visit_reminders_sent')
            .insert([{
                visit_id: visitId,
                days_ahead: daysAhead,
                sent_at: new Date().toISOString()
            }]);
    }

    async getWorkflowDetails(workflowId) {
        const { data, error } = await supabaseAdmin
            .from('approval_workflows')
            .select('*')
            .eq('id', workflowId)
            .single();

        return error ? null : data;
    }

    async getSystemAlertRecipients(severity) {
        const roles = severity === 'critical' ? ['admin'] : ['admin', 'manager'];
        
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id')
            .in('role', roles)
            .eq('is_active', true);

        return error ? [] : users.map(user => user.id);
    }

    async getSystemStatus() {
        // Return basic system status
        return {
            status: 'operational',
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = NotificationService;