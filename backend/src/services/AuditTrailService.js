const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Audit Trail Service
 * Comprehensive change management and audit logging system
 * Tracks all system changes, user actions, and data modifications
 * Provides compliance reporting and forensic analysis capabilities
 */
class AuditTrailService {
    constructor() {
        this.auditLevels = {
            LOW: 1,
            MEDIUM: 2,
            HIGH: 3,
            CRITICAL: 4
        };

        this.actionTypes = {
            CREATE: 'create',
            READ: 'read',
            UPDATE: 'update',
            DELETE: 'delete',
            LOGIN: 'login',
            LOGOUT: 'logout',
            APPROVE: 'approve',
            REJECT: 'reject',
            ASSIGN: 'assign',
            EXPORT: 'export',
            IMPORT: 'import',
            SYSTEM: 'system'
        };

        this.entityTypes = {
            USER: 'user',
            PARTNER: 'partner',
            INSTALLATION: 'installation',
            CONTRACT: 'contract',
            SCHEDULE: 'schedule',
            VISIT: 'visit',
            WORKFLOW: 'workflow',
            NOTIFICATION: 'notification',
            SYSTEM: 'system'
        };

        // Sensitive fields that should be masked in audit logs
        this.sensitiveFields = new Set([
            'password', 'password_hash', 'token', 'secret', 'key',
            'social_security_number', 'tax_number', 'bank_account'
        ]);

        // Auto-audit configuration for different entities
        this.autoAuditConfig = {
            users: { level: this.auditLevels.HIGH, trackReads: false },
            partners: { level: this.auditLevels.MEDIUM, trackReads: false },
            contracts: { level: this.auditLevels.HIGH, trackReads: true },
            schedules: { level: this.auditLevels.MEDIUM, trackReads: false },
            workflows: { level: this.auditLevels.HIGH, trackReads: true }
        };

        this.batchSize = 100;
        this.batchInterval = 5000; // 5 seconds
        this.auditQueue = [];
        
        // Start batch processing
        this.startBatchProcessing();
    }

    /**
     * Log audit event
     */
    async logAuditEvent(event) {
        try {
            // Validate required fields
            if (!this.validateAuditEvent(event)) {
                logger.warn('Invalid audit event provided', event);
                return;
            }

            // Enrich event with additional context
            const enrichedEvent = await this.enrichAuditEvent(event);

            // Add to batch queue
            this.auditQueue.push(enrichedEvent);

            // Process immediately for critical events
            if (enrichedEvent.level >= this.auditLevels.CRITICAL) {
                await this.flushAuditQueue();
            }

        } catch (error) {
            logger.error('Failed to log audit event:', error);
        }
    }

    /**
     * Log user action
     */
    async logUserAction(userId, action, entityType, entityId, details = {}) {
        const event = {
            userId,
            action,
            entityType,
            entityId,
            details,
            level: this.determineAuditLevel(action, entityType),
            timestamp: new Date().toISOString()
        };

        await this.logAuditEvent(event);
    }

    /**
     * Log data change
     */
    async logDataChange(userId, entityType, entityId, changes, metadata = {}) {
        // Mask sensitive data
        const sanitizedChanges = this.sanitizeChanges(changes);

        const event = {
            userId,
            action: this.actionTypes.UPDATE,
            entityType,
            entityId,
            details: {
                changes: sanitizedChanges,
                changeCount: Object.keys(changes).length,
                ...metadata
            },
            level: this.determineAuditLevel(this.actionTypes.UPDATE, entityType),
            timestamp: new Date().toISOString()
        };

        await this.logAuditEvent(event);
    }

    /**
     * Log system event
     */
    async logSystemEvent(eventType, details = {}, level = this.auditLevels.MEDIUM) {
        const event = {
            userId: 'system',
            action: this.actionTypes.SYSTEM,
            entityType: this.entityTypes.SYSTEM,
            entityId: eventType,
            details,
            level,
            timestamp: new Date().toISOString()
        };

        await this.logAuditEvent(event);
    }

    /**
     * Log authentication event
     */
    async logAuthEvent(userId, action, details = {}) {
        const event = {
            userId: userId || 'anonymous',
            action,
            entityType: this.entityTypes.USER,
            entityId: userId,
            details: {
                ...details,
                userAgent: details.userAgent,
                ipAddress: details.ipAddress,
                sessionId: details.sessionId
            },
            level: this.auditLevels.HIGH,
            timestamp: new Date().toISOString()
        };

        await this.logAuditEvent(event);
    }

    /**
     * Log workflow event
     */
    async logWorkflowEvent(workflowId, userId, action, stepId, details = {}) {
        const event = {
            userId,
            action,
            entityType: this.entityTypes.WORKFLOW,
            entityId: workflowId,
            details: {
                stepId,
                workflowId,
                ...details
            },
            level: this.auditLevels.HIGH,
            timestamp: new Date().toISOString()
        };

        await this.logAuditEvent(event);
    }

    /**
     * Get audit trail for entity
     */
    async getAuditTrail(entityType, entityId, options = {}) {
        try {
            const {
                startDate,
                endDate,
                actions,
                users,
                limit = 100,
                offset = 0,
                orderBy = 'timestamp',
                orderDirection = 'desc'
            } = options;

            let query = supabaseAdmin
                .from('audit_log')
                .select(`
                    *,
                    users!audit_log_user_id_fkey(name, email, role)
                `)
                .eq('entity_type', entityType)
                .eq('entity_id', entityId);

            // Apply filters
            if (startDate) {
                query = query.gte('timestamp', startDate);
            }

            if (endDate) {
                query = query.lte('timestamp', endDate);
            }

            if (actions && actions.length > 0) {
                query = query.in('action', actions);
            }

            if (users && users.length > 0) {
                query = query.in('user_id', users);
            }

            // Apply ordering and pagination
            query = query
                .order(orderBy, { ascending: orderDirection === 'asc' })
                .range(offset, offset + limit - 1);

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return {
                auditTrail: data || [],
                totalCount: data?.length || 0,
                hasMore: data?.length === limit
            };

        } catch (error) {
            logger.error('Failed to get audit trail:', error);
            throw error;
        }
    }

    /**
     * Get user activity log
     */
    async getUserActivityLog(userId, options = {}) {
        try {
            const {
                startDate,
                endDate,
                entityTypes,
                actions,
                limit = 50,
                offset = 0
            } = options;

            let query = supabaseAdmin
                .from('audit_log')
                .select('*')
                .eq('user_id', userId);

            // Apply filters
            if (startDate) {
                query = query.gte('timestamp', startDate);
            }

            if (endDate) {
                query = query.lte('timestamp', endDate);
            }

            if (entityTypes && entityTypes.length > 0) {
                query = query.in('entity_type', entityTypes);
            }

            if (actions && actions.length > 0) {
                query = query.in('action', actions);
            }

            query = query
                .order('timestamp', { ascending: false })
                .range(offset, offset + limit - 1);

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return {
                activities: data || [],
                totalCount: data?.length || 0,
                hasMore: data?.length === limit
            };

        } catch (error) {
            logger.error('Failed to get user activity log:', error);
            throw error;
        }
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(options = {}) {
        try {
            const {
                startDate,
                endDate,
                entityTypes,
                includeSensitiveData = false,
                format = 'json'
            } = options;

            // Get audit data
            let query = supabaseAdmin
                .from('audit_log')
                .select(`
                    *,
                    users!audit_log_user_id_fkey(name, email, role)
                `);

            if (startDate) {
                query = query.gte('timestamp', startDate);
            }

            if (endDate) {
                query = query.lte('timestamp', endDate);
            }

            if (entityTypes && entityTypes.length > 0) {
                query = query.in('entity_type', entityTypes);
            }

            const { data: auditData, error } = await query.order('timestamp', { ascending: false });

            if (error) {
                throw error;
            }

            // Generate report analytics
            const report = {
                reportMetadata: {
                    generatedAt: new Date().toISOString(),
                    startDate,
                    endDate,
                    totalEvents: auditData.length,
                    includeSensitiveData
                },
                summary: this.generateReportSummary(auditData),
                userActivity: this.analyzeUserActivity(auditData),
                systemActivity: this.analyzeSystemActivity(auditData),
                securityEvents: this.analyzeSecurityEvents(auditData),
                dataChanges: this.analyzeDataChanges(auditData),
                complianceMetrics: this.calculateComplianceMetrics(auditData)
            };

            // Include raw data if requested
            if (includeSensitiveData) {
                report.rawData = auditData;
            } else {
                report.events = auditData.map(event => this.sanitizeAuditEvent(event));
            }

            return report;

        } catch (error) {
            logger.error('Failed to generate compliance report:', error);
            throw error;
        }
    }

    /**
     * Search audit logs
     */
    async searchAuditLogs(searchCriteria) {
        try {
            const {
                keywords,
                startDate,
                endDate,
                userId,
                entityType,
                entityId,
                action,
                level,
                limit = 100,
                offset = 0
            } = searchCriteria;

            let query = supabaseAdmin
                .from('audit_log')
                .select(`
                    *,
                    users!audit_log_user_id_fkey(name, email, role)
                `);

            // Apply filters
            if (startDate) {
                query = query.gte('timestamp', startDate);
            }

            if (endDate) {
                query = query.lte('timestamp', endDate);
            }

            if (userId) {
                query = query.eq('user_id', userId);
            }

            if (entityType) {
                query = query.eq('entity_type', entityType);
            }

            if (entityId) {
                query = query.eq('entity_id', entityId);
            }

            if (action) {
                query = query.eq('action', action);
            }

            if (level) {
                query = query.gte('level', level);
            }

            // Text search in details (simplified - would use full-text search in production)
            if (keywords) {
                query = query.textSearch('details', keywords);
            }

            query = query
                .order('timestamp', { ascending: false })
                .range(offset, offset + limit - 1);

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return {
                results: data || [],
                totalCount: data?.length || 0,
                hasMore: data?.length === limit,
                searchCriteria
            };

        } catch (error) {
            logger.error('Failed to search audit logs:', error);
            throw error;
        }
    }

    /**
     * Export audit data
     */
    async exportAuditData(exportOptions) {
        try {
            const {
                format = 'csv',
                startDate,
                endDate,
                entityTypes,
                includeDetails = true
            } = exportOptions;

            // Get audit data
            const auditData = await this.getFilteredAuditData({
                startDate,
                endDate,
                entityTypes
            });

            // Format data based on export format
            let exportData;
            switch (format.toLowerCase()) {
                case 'csv':
                    exportData = this.formatAsCSV(auditData, includeDetails);
                    break;
                case 'json':
                    exportData = this.formatAsJSON(auditData, includeDetails);
                    break;
                case 'excel':
                    exportData = await this.formatAsExcel(auditData, includeDetails);
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            // Log the export
            await this.logSystemEvent('audit_export', {
                format,
                recordCount: auditData.length,
                startDate,
                endDate
            });

            return {
                data: exportData,
                format,
                recordCount: auditData.length,
                exportedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to export audit data:', error);
            throw error;
        }
    }

    /**
     * Validate audit event structure
     */
    validateAuditEvent(event) {
        const required = ['userId', 'action', 'entityType', 'entityId'];
        return required.every(field => event[field] !== undefined && event[field] !== null);
    }

    /**
     * Enrich audit event with additional context
     */
    async enrichAuditEvent(event) {
        const enriched = {
            ...event,
            id: this.generateAuditId(),
            sessionId: event.sessionId || null,
            ipAddress: event.ipAddress || null,
            userAgent: event.userAgent || null,
            level: event.level || this.determineAuditLevel(event.action, event.entityType),
            timestamp: event.timestamp || new Date().toISOString()
        };

        // Add correlation ID for related events
        if (event.correlationId) {
            enriched.correlationId = event.correlationId;
        }

        return enriched;
    }

    /**
     * Determine audit level based on action and entity type
     */
    determineAuditLevel(action, entityType) {
        // Critical actions
        const criticalActions = ['delete', 'approve', 'reject'];
        if (criticalActions.includes(action)) {
            return this.auditLevels.CRITICAL;
        }

        // High-level entities
        const highLevelEntities = ['user', 'contract', 'workflow'];
        if (highLevelEntities.includes(entityType)) {
            return this.auditLevels.HIGH;
        }

        // Authentication actions
        const authActions = ['login', 'logout'];
        if (authActions.includes(action)) {
            return this.auditLevels.HIGH;
        }

        // Default to medium
        return this.auditLevels.MEDIUM;
    }

    /**
     * Sanitize changes to remove sensitive data
     */
    sanitizeChanges(changes) {
        const sanitized = {};
        
        for (const [field, change] of Object.entries(changes)) {
            if (this.sensitiveFields.has(field.toLowerCase())) {
                // Mask sensitive fields
                sanitized[field] = {
                    oldValue: '[MASKED]',
                    newValue: '[MASKED]',
                    changed: true
                };
            } else {
                sanitized[field] = change;
            }
        }

        return sanitized;
    }

    /**
     * Sanitize audit event for public consumption
     */
    sanitizeAuditEvent(event) {
        const sanitized = { ...event };
        
        // Remove sensitive details
        if (sanitized.details) {
            sanitized.details = this.sanitizeObject(sanitized.details);
        }

        return sanitized;
    }

    /**
     * Sanitize object by masking sensitive fields
     */
    sanitizeObject(obj) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (this.sensitiveFields.has(key.toLowerCase())) {
                sanitized[key] = '[MASKED]';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Start batch processing of audit events
     */
    startBatchProcessing() {
        setInterval(async () => {
            if (this.auditQueue.length > 0) {
                await this.flushAuditQueue();
            }
        }, this.batchInterval);
    }

    /**
     * Flush audit queue to database
     */
    async flushAuditQueue() {
        if (this.auditQueue.length === 0) return;

        try {
            const events = this.auditQueue.splice(0, this.batchSize);
            
            const { error } = await supabaseAdmin
                .from('audit_log')
                .insert(events);

            if (error) {
                throw error;
            }

            logger.debug(`Flushed ${events.length} audit events to database`);

        } catch (error) {
            logger.error('Failed to flush audit queue:', error);
            // Re-add failed events to queue for retry
            this.auditQueue.unshift(...events);
        }
    }

    /**
     * Generate unique audit ID
     */
    generateAuditId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Analytics methods
    generateReportSummary(auditData) {
        const summary = {
            totalEvents: auditData.length,
            uniqueUsers: new Set(auditData.map(e => e.user_id)).size,
            uniqueEntities: new Set(auditData.map(e => `${e.entity_type}:${e.entity_id}`)).size,
            timeRange: {
                start: auditData[auditData.length - 1]?.timestamp,
                end: auditData[0]?.timestamp
            }
        };

        // Count by action type
        summary.actionBreakdown = auditData.reduce((breakdown, event) => {
            breakdown[event.action] = (breakdown[event.action] || 0) + 1;
            return breakdown;
        }, {});

        // Count by entity type
        summary.entityBreakdown = auditData.reduce((breakdown, event) => {
            breakdown[event.entity_type] = (breakdown[event.entity_type] || 0) + 1;
            return breakdown;
        }, {});

        return summary;
    }

    analyzeUserActivity(auditData) {
        const userActivity = {};
        
        auditData.forEach(event => {
            if (!userActivity[event.user_id]) {
                userActivity[event.user_id] = {
                    userId: event.user_id,
                    userName: event.users?.name || 'Unknown',
                    totalActions: 0,
                    actionTypes: {},
                    lastActivity: event.timestamp
                };
            }
            
            const user = userActivity[event.user_id];
            user.totalActions++;
            user.actionTypes[event.action] = (user.actionTypes[event.action] || 0) + 1;
            
            if (event.timestamp > user.lastActivity) {
                user.lastActivity = event.timestamp;
            }
        });

        return Object.values(userActivity)
            .sort((a, b) => b.totalActions - a.totalActions)
            .slice(0, 20); // Top 20 most active users
    }

    analyzeSystemActivity(auditData) {
        const systemEvents = auditData.filter(e => e.user_id === 'system');
        
        return {
            totalSystemEvents: systemEvents.length,
            systemEventTypes: systemEvents.reduce((types, event) => {
                types[event.entity_id] = (types[event.entity_id] || 0) + 1;
                return types;
            }, {})
        };
    }

    analyzeSecurityEvents(auditData) {
        const securityActions = ['login', 'logout', 'failed_login', 'password_change'];
        const securityEvents = auditData.filter(e => securityActions.includes(e.action));
        
        return {
            totalSecurityEvents: securityEvents.length,
            loginAttempts: securityEvents.filter(e => e.action === 'login').length,
            failedLogins: securityEvents.filter(e => e.action === 'failed_login').length,
            logouts: securityEvents.filter(e => e.action === 'logout').length
        };
    }

    analyzeDataChanges(auditData) {
        const dataChanges = auditData.filter(e => e.action === 'update');
        
        return {
            totalDataChanges: dataChanges.length,
            entitiesModified: new Set(dataChanges.map(e => `${e.entity_type}:${e.entity_id}`)).size,
            mostModifiedEntities: this.getTopModifiedEntities(dataChanges)
        };
    }

    getTopModifiedEntities(dataChanges) {
        const entityCounts = dataChanges.reduce((counts, event) => {
            const entityKey = `${event.entity_type}:${event.entity_id}`;
            counts[entityKey] = (counts[entityKey] || 0) + 1;
            return counts;
        }, {});

        return Object.entries(entityCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([entity, count]) => ({ entity, count }));
    }

    calculateComplianceMetrics(auditData) {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

        const recentEvents = auditData.filter(e => new Date(e.timestamp).getTime() > oneDayAgo);
        const weeklyEvents = auditData.filter(e => new Date(e.timestamp).getTime() > oneWeekAgo);

        return {
            dailyActivity: recentEvents.length,
            weeklyActivity: weeklyEvents.length,
            avgDailyActivity: weeklyEvents.length / 7,
            dataRetentionCompliance: true, // Would check actual retention policies
            auditCoverage: this.calculateAuditCoverage(auditData)
        };
    }

    calculateAuditCoverage(auditData) {
        // Calculate what percentage of system actions are being audited
        // This is a simplified calculation
        return {
            coveragePercentage: 95, // Placeholder
            missingAudits: [],
            recommendedImprovements: []
        };
    }

    // Placeholder methods for data formatting
    async getFilteredAuditData(filters) {
        // Implementation would filter and return audit data
        return [];
    }

    formatAsCSV(data, includeDetails) {
        // Implementation would format data as CSV
        return 'csv,data,here';
    }

    formatAsJSON(data, includeDetails) {
        // Implementation would format data as JSON
        return JSON.stringify(data);
    }

    async formatAsExcel(data, includeDetails) {
        // Implementation would format data as Excel
        return Buffer.from('excel data');
    }
}

module.exports = AuditTrailService;