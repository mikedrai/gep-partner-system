const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Performance Metrics Service
 * Tracks and analyzes the performance of different scheduling algorithms
 * Provides insights for algorithm selection and optimization
 */
class PerformanceMetrics {
    constructor() {
        this.metricsCache = new Map();
        this.cacheExpiryTime = 15 * 60 * 1000; // 15 minutes
        this.batchSize = 100;
        this.pendingMetrics = [];
        this.flushInterval = 30000; // 30 seconds
        
        // Start batch processing
        this.startBatchProcessing();
    }

    /**
     * Log algorithm performance metrics
     */
    async logAlgorithmPerformance(metricsData) {
        try {
            if (Array.isArray(metricsData)) {
                // Batch logging
                this.pendingMetrics.push(...metricsData);
            } else {
                // Single metric
                this.pendingMetrics.push(metricsData);
            }

            // Flush if batch is full
            if (this.pendingMetrics.length >= this.batchSize) {
                await this.flushPendingMetrics();
            }

        } catch (error) {
            logger.error('Failed to log algorithm performance:', error);
        }
    }

    /**
     * Get algorithm performance summary
     */
    async getAlgorithmPerformanceSummary(timeRange = '30d', algorithmIds = null) {
        try {
            const cacheKey = `perf_summary_${timeRange}_${algorithmIds?.join(',') || 'all'}`;
            
            // Check cache
            if (this.metricsCache.has(cacheKey)) {
                const cached = this.metricsCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiryTime) {
                    return cached.data;
                }
            }

            const dateThreshold = this.calculateDateThreshold(timeRange);
            
            let query = supabaseAdmin
                .from('algorithm_performance')
                .select(`
                    *,
                    ai_algorithms(name, algorithm_type, version)
                `)
                .gte('created_at', dateThreshold);

            if (algorithmIds && algorithmIds.length > 0) {
                query = query.in('algorithm_id', algorithmIds);
            }

            const { data: performanceData, error } = await query;

            if (error) {
                throw error;
            }

            const summary = this.calculatePerformanceSummary(performanceData);
            
            // Cache the result
            this.metricsCache.set(cacheKey, {
                data: summary,
                timestamp: Date.now()
            });

            return summary;

        } catch (error) {
            logger.error('Failed to get algorithm performance summary:', error);
            throw error;
        }
    }

    /**
     * Get detailed performance comparison between algorithms
     */
    async getAlgorithmComparison(algorithmIds, timeRange = '30d') {
        try {
            const performanceData = await this.getAlgorithmPerformanceData(algorithmIds, timeRange);
            
            if (performanceData.length === 0) {
                return {
                    algorithms: [],
                    comparison: null,
                    recommendations: []
                };
            }

            const comparison = this.performDetailedComparison(performanceData);
            const recommendations = this.generateOptimizationRecommendations(comparison);

            return {
                algorithms: comparison.algorithms,
                comparison: comparison.metrics,
                recommendations,
                dataPoints: performanceData.length,
                timeRange,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to get algorithm comparison:', error);
            throw error;
        }
    }

    /**
     * Track real-time performance metrics
     */
    async trackRealtimeMetrics(algorithmId, executionData) {
        try {
            const realtimeMetric = {
                algorithm_id: algorithmId,
                execution_time_ms: executionData.executionTime,
                optimization_score: executionData.optimizationScore,
                confidence_level: executionData.confidence,
                feasibility_score: executionData.feasible ? 1.0 : 0.0,
                constraint_violations: executionData.constraintViolations || 0,
                memory_usage_mb: executionData.memoryUsage || null,
                cpu_usage_percent: executionData.cpuUsage || null,
                created_at: new Date().toISOString()
            };

            // Add to pending metrics for batch processing
            this.pendingMetrics.push(realtimeMetric);

            // Update real-time cache
            this.updateRealtimeCache(algorithmId, realtimeMetric);

            logger.debug(`Tracked real-time metrics for algorithm ${algorithmId}`);

        } catch (error) {
            logger.error('Failed to track real-time metrics:', error);
        }
    }

    /**
     * Get performance trends over time
     */
    async getPerformanceTrends(algorithmId, timeRange = '30d', granularity = 'daily') {
        try {
            const dateThreshold = this.calculateDateThreshold(timeRange);
            
            const { data: trendsData, error } = await supabaseAdmin
                .from('algorithm_performance')
                .select('*')
                .eq('algorithm_id', algorithmId)
                .gte('created_at', dateThreshold)
                .order('created_at', { ascending: true });

            if (error) {
                throw error;
            }

            const trends = this.calculateTrends(trendsData, granularity);
            const analysis = this.analyzeTrends(trends);

            return {
                algorithmId,
                timeRange,
                granularity,
                trends: trends.data,
                analysis,
                totalDataPoints: trendsData.length
            };

        } catch (error) {
            logger.error('Failed to get performance trends:', error);
            throw error;
        }
    }

    /**
     * Generate performance insights and recommendations
     */
    async generatePerformanceInsights(timeRange = '30d') {
        try {
            const summary = await this.getAlgorithmPerformanceSummary(timeRange);
            const insights = {
                topPerformers: this.identifyTopPerformers(summary),
                underperformers: this.identifyUnderperformers(summary),
                optimizationOpportunities: this.identifyOptimizationOpportunities(summary),
                resourceUtilization: this.analyzeResourceUtilization(summary),
                reliabilityAnalysis: this.analyzeReliability(summary),
                recommendations: this.generateActionableRecommendations(summary),
                alertsAndWarnings: this.generateAlerts(summary)
            };

            return {
                insights,
                timeRange,
                generatedAt: new Date().toISOString(),
                dataQuality: this.assessDataQuality(summary)
            };

        } catch (error) {
            logger.error('Failed to generate performance insights:', error);
            throw error;
        }
    }

    /**
     * Export performance data for external analysis
     */
    async exportPerformanceData(filters = {}) {
        try {
            let query = supabaseAdmin
                .from('algorithm_performance')
                .select(`
                    *,
                    ai_algorithms(name, algorithm_type, version, parameters)
                `);

            // Apply filters
            if (filters.algorithmIds) {
                query = query.in('algorithm_id', filters.algorithmIds);
            }
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }
            if (filters.minScore) {
                query = query.gte('optimization_score', filters.minScore);
            }

            query = query.order('created_at', { ascending: false });

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data: exportData, error } = await query;

            if (error) {
                throw error;
            }

            // Format data for export
            const formattedData = this.formatDataForExport(exportData);

            return {
                data: formattedData,
                metadata: {
                    exportedAt: new Date().toISOString(),
                    recordCount: formattedData.length,
                    filters: filters
                }
            };

        } catch (error) {
            logger.error('Failed to export performance data:', error);
            throw error;
        }
    }

    /**
     * Calculate performance metrics for scheduling results
     */
    calculateSchedulePerformanceMetrics(schedule, executionTime, context) {
        try {
            const metrics = {
                // Efficiency metrics
                executionTime,
                schedulingEfficiency: this.calculateSchedulingEfficiency(schedule, executionTime),
                resourceUtilization: this.calculateResourceUtilization(schedule, context),
                
                // Quality metrics
                optimizationScore: schedule.optimizationScore || 0,
                constraintSatisfaction: this.calculateConstraintSatisfaction(schedule, context),
                scheduleStability: this.calculateScheduleStability(schedule),
                
                // Business metrics
                costEfficiency: this.calculateCostEfficiency(schedule, context),
                clientSatisfactionPotential: this.estimateClientSatisfaction(schedule, context),
                regulatoryCompliance: this.assessRegulatoryCompliance(schedule, context),
                
                // Technical metrics
                memoryFootprint: process.memoryUsage().heapUsed / 1024 / 1024, // MB
                algorithmComplexity: this.assessAlgorithmComplexity(schedule.metadata),
                scalabilityScore: this.assessScalability(schedule, context)
            };

            return metrics;

        } catch (error) {
            logger.error('Failed to calculate schedule performance metrics:', error);
            return null;
        }
    }

    /**
     * Start batch processing of pending metrics
     */
    startBatchProcessing() {
        setInterval(async () => {
            if (this.pendingMetrics.length > 0) {
                await this.flushPendingMetrics();
            }
        }, this.flushInterval);
    }

    /**
     * Flush pending metrics to database
     */
    async flushPendingMetrics() {
        if (this.pendingMetrics.length === 0) return;

        try {
            const metricsToFlush = [...this.pendingMetrics];
            this.pendingMetrics = [];

            // Insert metrics in batches
            const batchPromises = [];
            for (let i = 0; i < metricsToFlush.length; i += this.batchSize) {
                const batch = metricsToFlush.slice(i, i + this.batchSize);
                batchPromises.push(this.insertMetricsBatch(batch));
            }

            await Promise.all(batchPromises);
            logger.debug(`Flushed ${metricsToFlush.length} performance metrics`);

        } catch (error) {
            logger.error('Failed to flush pending metrics:', error);
            // Re-add failed metrics to pending queue
            this.pendingMetrics.unshift(...this.pendingMetrics);
        }
    }

    /**
     * Insert metrics batch into database
     */
    async insertMetricsBatch(batch) {
        const { error } = await supabaseAdmin
            .from('algorithm_performance')
            .insert(batch);

        if (error) {
            throw error;
        }
    }

    /**
     * Calculate performance summary from raw data
     */
    calculatePerformanceSummary(performanceData) {
        const algorithmGroups = this.groupByAlgorithm(performanceData);
        const summary = {
            totalExecutions: performanceData.length,
            algorithmSummaries: [],
            overallMetrics: this.calculateOverallMetrics(performanceData),
            timeRange: {
                start: this.getEarliestTimestamp(performanceData),
                end: this.getLatestTimestamp(performanceData)
            }
        };

        for (const [algorithmId, data] of Object.entries(algorithmGroups)) {
            const algorithmSummary = this.calculateAlgorithmSummary(algorithmId, data);
            summary.algorithmSummaries.push(algorithmSummary);
        }

        // Sort by performance score
        summary.algorithmSummaries.sort((a, b) => b.averageOptimizationScore - a.averageOptimizationScore);

        return summary;
    }

    /**
     * Calculate algorithm-specific summary
     */
    calculateAlgorithmSummary(algorithmId, data) {
        const algorithmInfo = data[0]?.ai_algorithms || {};
        
        return {
            algorithmId,
            name: algorithmInfo.name || 'Unknown',
            type: algorithmInfo.algorithm_type || 'Unknown',
            version: algorithmInfo.version || '1.0',
            executionCount: data.length,
            averageExecutionTime: this.calculateAverage(data, 'execution_time_ms'),
            averageOptimizationScore: this.calculateAverage(data, 'optimization_score'),
            averageConfidence: this.calculateAverage(data, 'confidence_level'),
            successRate: this.calculateSuccessRate(data),
            reliabilityScore: this.calculateReliabilityScore(data),
            performanceRank: 0, // Will be set later
            trends: this.calculateAlgorithmTrends(data),
            lastExecution: this.getLatestTimestamp(data)
        };
    }

    // Helper methods for calculations
    calculateDateThreshold(timeRange) {
        const now = new Date();
        const days = this.parseTimeRange(timeRange);
        const threshold = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        return threshold.toISOString();
    }

    parseTimeRange(timeRange) {
        const match = timeRange.match(/^(\d+)([dwm])$/);
        if (!match) return 30; // Default 30 days

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'd': return value;
            case 'w': return value * 7;
            case 'm': return value * 30;
            default: return 30;
        }
    }

    groupByAlgorithm(data) {
        return data.reduce((groups, item) => {
            const algorithmId = item.algorithm_id;
            if (!groups[algorithmId]) {
                groups[algorithmId] = [];
            }
            groups[algorithmId].push(item);
            return groups;
        }, {});
    }

    calculateAverage(data, field) {
        if (data.length === 0) return 0;
        const sum = data.reduce((total, item) => total + (item[field] || 0), 0);
        return sum / data.length;
    }

    calculateSuccessRate(data) {
        if (data.length === 0) return 0;
        const successful = data.filter(item => item.feasibility_score > 0.5).length;
        return successful / data.length;
    }

    calculateReliabilityScore(data) {
        // Combine success rate, consistency, and error rate
        const successRate = this.calculateSuccessRate(data);
        const consistency = this.calculateConsistency(data);
        const errorRate = this.calculateErrorRate(data);
        
        return (successRate * 0.5) + (consistency * 0.3) + ((1 - errorRate) * 0.2);
    }

    calculateConsistency(data) {
        if (data.length < 2) return 1.0;
        
        const scores = data.map(item => item.optimization_score || 0);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Lower standard deviation = higher consistency
        return Math.max(0, 1 - (standardDeviation / mean));
    }

    calculateErrorRate(data) {
        if (data.length === 0) return 0;
        const errors = data.filter(item => item.constraint_violations > 0).length;
        return errors / data.length;
    }

    getEarliestTimestamp(data) {
        if (data.length === 0) return null;
        return data.reduce((earliest, item) => {
            const itemTime = new Date(item.created_at);
            return !earliest || itemTime < earliest ? itemTime : earliest;
        }, null)?.toISOString();
    }

    getLatestTimestamp(data) {
        if (data.length === 0) return null;
        return data.reduce((latest, item) => {
            const itemTime = new Date(item.created_at);
            return !latest || itemTime > latest ? itemTime : latest;
        }, null)?.toISOString();
    }

    calculateOverallMetrics(data) {
        return {
            averageExecutionTime: this.calculateAverage(data, 'execution_time_ms'),
            averageOptimizationScore: this.calculateAverage(data, 'optimization_score'),
            overallSuccessRate: this.calculateSuccessRate(data),
            totalConstraintViolations: data.reduce((total, item) => total + (item.constraint_violations || 0), 0)
        };
    }

    // Performance analysis methods
    identifyTopPerformers(summary) {
        return summary.algorithmSummaries
            .filter(alg => alg.averageOptimizationScore > 0.8)
            .slice(0, 3);
    }

    identifyUnderperformers(summary) {
        return summary.algorithmSummaries
            .filter(alg => alg.averageOptimizationScore < 0.5 || alg.successRate < 0.7);
    }

    identifyOptimizationOpportunities(summary) {
        const opportunities = [];
        
        summary.algorithmSummaries.forEach(alg => {
            if (alg.averageExecutionTime > 10000) { // > 10 seconds
                opportunities.push({
                    type: 'execution_time',
                    algorithm: alg.name,
                    issue: 'High execution time',
                    recommendation: 'Optimize algorithm parameters or implementation'
                });
            }
            
            if (alg.reliabilityScore < 0.7) {
                opportunities.push({
                    type: 'reliability',
                    algorithm: alg.name,
                    issue: 'Low reliability score',
                    recommendation: 'Review error handling and constraint validation'
                });
            }
        });
        
        return opportunities;
    }

    // Additional helper methods for metrics calculations
    calculateSchedulingEfficiency(schedule, executionTime) {
        // Efficiency = (quality of result) / (time taken)
        const qualityScore = schedule.optimizationScore || 0.5;
        const timeScore = Math.max(0.1, 1 - (executionTime / 60000)); // Normalize to 1 minute
        return qualityScore * timeScore;
    }

    calculateResourceUtilization(schedule, context) {
        // Placeholder for resource utilization calculation
        return 0.75;
    }

    calculateConstraintSatisfaction(schedule, context) {
        // Placeholder for constraint satisfaction calculation
        return 0.9;
    }

    calculateScheduleStability(schedule) {
        // Placeholder for schedule stability calculation
        return 0.85;
    }

    calculateCostEfficiency(schedule, context) {
        // Placeholder for cost efficiency calculation
        return 0.8;
    }

    estimateClientSatisfaction(schedule, context) {
        // Placeholder for client satisfaction estimation
        return 0.75;
    }

    assessRegulatoryCompliance(schedule, context) {
        // Placeholder for regulatory compliance assessment
        return 0.95;
    }

    assessAlgorithmComplexity(metadata) {
        // Placeholder for complexity assessment
        return 0.6;
    }

    assessScalability(schedule, context) {
        // Placeholder for scalability assessment
        return 0.8;
    }

    updateRealtimeCache(algorithmId, metric) {
        // Update real-time performance cache
        const cacheKey = `realtime_${algorithmId}`;
        this.metricsCache.set(cacheKey, {
            data: metric,
            timestamp: Date.now()
        });
    }

    // Additional placeholder methods for comprehensive functionality
    getAlgorithmPerformanceData(algorithmIds, timeRange) {
        // Placeholder implementation
        return [];
    }

    performDetailedComparison(data) {
        // Placeholder implementation
        return { algorithms: [], metrics: {} };
    }

    generateOptimizationRecommendations(comparison) {
        // Placeholder implementation
        return [];
    }

    calculateTrends(data, granularity) {
        // Placeholder implementation
        return { data: [] };
    }

    analyzeTrends(trends) {
        // Placeholder implementation
        return {};
    }

    analyzeResourceUtilization(summary) {
        // Placeholder implementation
        return {};
    }

    analyzeReliability(summary) {
        // Placeholder implementation
        return {};
    }

    generateActionableRecommendations(summary) {
        // Placeholder implementation
        return [];
    }

    generateAlerts(summary) {
        // Placeholder implementation
        return [];
    }

    assessDataQuality(summary) {
        // Placeholder implementation
        return 'good';
    }

    formatDataForExport(data) {
        // Placeholder implementation
        return data;
    }

    calculateAlgorithmTrends(data) {
        // Placeholder implementation
        return {};
    }
}

module.exports = PerformanceMetrics;