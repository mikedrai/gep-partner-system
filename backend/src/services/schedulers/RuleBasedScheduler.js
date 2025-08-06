const BaseScheduler = require('./BaseScheduler');
const logger = require('../../utils/logger');

/**
 * Rule-Based Expert System Scheduler
 * Uses domain-specific rules and heuristics for partner assignment and scheduling
 * Implements business logic and regulatory compliance rules
 */
class RuleBasedScheduler extends BaseScheduler {
    constructor(config) {
        super(config);
        this.priorityRules = this.parameters.priority_rules || ['historical_preference', 'cost_efficiency', 'location_proximity'];
        this.strictRules = this.parameters.strict_rules || true;
        this.ruleWeights = this.parameters.rule_weights || {};
        this.flexibilityLevel = this.parameters.flexibility_level || 'medium';
        this.complianceMode = this.parameters.compliance_mode || 'strict';
        
        // Rule engine
        this.rules = [];
        this.ruleEngine = null;
    }

    /**
     * Initialize the rule-based scheduler
     */
    async initialize() {
        try {
            logger.info('Initializing RuleBasedScheduler');
            
            // Load business rules
            this.loadBusinessRules();
            
            // Load regulatory rules
            this.loadRegulatoryRules();
            
            // Load preference rules
            this.loadPreferenceRules();
            
            // Initialize rule engine
            this.initializeRuleEngine();
            
            this.isInitialized = true;
            logger.info(`RuleBasedScheduler initialized with ${this.rules.length} rules`);

        } catch (error) {
            logger.error('Failed to initialize RuleBasedScheduler:', error);
            throw error;
        }
    }

    /**
     * Generate optimal schedule using rule-based logic
     */
    async generateSchedule(context) {
        try {
            const startTime = Date.now();
            logger.info('Starting rule-based optimization');

            // Validate context
            if (!context.availablePartners || context.availablePartners.length === 0) {
                throw new Error('No available partners for scheduling');
            }

            // Apply rules to evaluate partners
            const evaluatedPartners = this.evaluatePartnersWithRules(context);
            
            // Select best partner based on rule evaluation
            const selectedPartner = this.selectOptimalPartner(evaluatedPartners, context);
            
            // Generate schedule using rule-based parameters
            const schedule = this.generateRuleBasedSchedule(selectedPartner, context);

            // Apply rule-based optimizations
            const optimizedSchedule = this.applyRuleBasedOptimizations(schedule, context);

            // Validate schedule against all rules
            const ruleValidation = this.validateScheduleAgainstRules(optimizedSchedule, context);
            
            if (!ruleValidation.compliant) {
                logger.warn('Schedule violates rules:', ruleValidation.violations);
                
                // Try to fix violations using rule-based corrections
                const correctedSchedule = this.correctRuleViolations(optimizedSchedule, ruleValidation.violations, context);
                if (correctedSchedule) {
                    optimizedSchedule.visits = correctedSchedule.visits;
                    optimizedSchedule.totalHours = correctedSchedule.totalHours;
                }
            }

            const executionTime = Date.now() - startTime;
            
            const result = {
                partnerId: selectedPartner.partnerId,
                partnerName: selectedPartner.partnerName,
                optimizationScore: selectedPartner.totalScore,
                totalHours: optimizedSchedule.totalHours,
                visitDuration: optimizedSchedule.visitDuration,
                visitsPerMonth: optimizedSchedule.visitsPerMonth,
                visits: optimizedSchedule.visits,
                feasible: selectedPartner.totalScore > 0.5,
                confidence: this.calculateRuleBasedConfidence(selectedPartner, ruleValidation),
                executionTime,
                metadata: {
                    algorithm: 'rule_based',
                    rulesApplied: selectedPartner.appliedRules.length,
                    ruleViolations: ruleValidation.violations.length,
                    complianceScore: ruleValidation.complianceScore,
                    strictMode: this.strictRules,
                    flexibilityLevel: this.flexibilityLevel,
                    ruleBreakdown: selectedPartner.ruleScores
                }
            };

            this.logMetrics(executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('Rule-based schedule generation failed:', error);
            throw error;
        }
    }

    /**
     * Load business rules for partner selection and scheduling
     */
    loadBusinessRules() {
        // Historical preference rules
        this.rules.push({
            id: 'historical_success',
            name: 'Historical Success Preference',
            type: 'preference',
            priority: 10,
            weight: this.ruleWeights.historical_success || 0.25,
            condition: (partner, context) => {
                const historicalScore = this.calculateHistoricalScore(partner, context.installation, context.historicalData);
                return historicalScore;
            },
            action: 'boost_score',
            description: 'Prefer partners with successful history at this installation'
        });

        // Cost efficiency rules
        this.rules.push({
            id: 'cost_efficiency',
            name: 'Cost Efficiency Rule',
            type: 'business',
            priority: 8,
            weight: this.ruleWeights.cost_efficiency || 0.20,
            condition: (partner, context) => {
                const budget = context.contract?.budget_limit || Infinity;
                const requiredHours = context.regulatoryRequirements?.minimumHoursPerMonth || 20;
                const estimatedCost = partner.hourly_rate * requiredHours;
                
                if (estimatedCost <= budget * 0.8) return 1.0; // Under 80% of budget
                if (estimatedCost <= budget) return 0.8; // Within budget
                return 0.0; // Over budget
            },
            action: 'score_multiplier',
            description: 'Prefer cost-efficient partners within budget'
        });

        // Location proximity rules
        this.rules.push({
            id: 'location_proximity',
            name: 'Location Proximity Rule',
            type: 'efficiency',
            priority: 7,
            weight: this.ruleWeights.location_proximity || 0.30,
            condition: (partner, context) => {
                const distance = this.calculateDistance(partner.city, context.installation?.address || '');
                if (distance <= 10) return 1.0; // Very close
                if (distance <= 25) return 0.8; // Close
                if (distance <= 50) return 0.6; // Moderate
                return 0.3; // Far
            },
            action: 'score_multiplier',
            description: 'Prefer partners located close to installation'
        });

        // Specialty match rules
        this.rules.push({
            id: 'specialty_match',
            name: 'Specialty Match Rule',
            type: 'qualification',
            priority: 9,
            weight: this.ruleWeights.specialty_match || 0.25,
            condition: (partner, context) => {
                return this.calculateSpecialtyScore(partner, context.installation?.service_type);
            },
            action: 'score_multiplier',
            description: 'Ensure partner specialty matches service requirements'
        });

        // Availability rules
        this.rules.push({
            id: 'availability_adequate',
            name: 'Adequate Availability Rule',
            type: 'constraint',
            priority: 10,
            weight: 1.0,
            condition: (partner, context) => {
                const availableHours = this.calculatePartnerAvailableHours(partner);
                const requiredHours = context.regulatoryRequirements?.minimumHoursPerMonth || 20;
                return availableHours >= requiredHours ? 1.0 : 0.0;
            },
            action: 'hard_constraint',
            description: 'Partner must have adequate availability'
        });

        // Workload balance rules
        this.rules.push({
            id: 'workload_balance',
            name: 'Workload Balance Rule',
            type: 'business',
            priority: 5,
            weight: this.ruleWeights.workload_balance || 0.15,
            condition: (partner, context) => {
                const currentWorkload = this.calculatePartnerCurrentWorkload(partner);
                const maxWorkload = partner.max_weekly_hours || 40;
                const utilizationRate = currentWorkload / maxWorkload;
                
                if (utilizationRate < 0.6) return 1.0; // Under-utilized
                if (utilizationRate < 0.8) return 0.8; // Well-utilized
                if (utilizationRate < 0.95) return 0.6; // Highly utilized
                return 0.2; // Over-utilized
            },
            action: 'score_multiplier',
            description: 'Balance workload across partners'
        });

        // Client satisfaction rules
        this.rules.push({
            id: 'client_satisfaction',
            name: 'Client Satisfaction Rule',
            type: 'quality',
            priority: 6,
            weight: this.ruleWeights.client_satisfaction || 0.20,
            condition: (partner, context) => {
                const clientFeedback = this.getClientFeedbackScore(partner, context.installation);
                return clientFeedback;
            },
            action: 'boost_score',
            description: 'Prefer partners with high client satisfaction'
        });
    }

    /**
     * Load regulatory compliance rules
     */
    loadRegulatoryRules() {
        // SEPE minimum hours compliance
        this.rules.push({
            id: 'sepe_minimum_hours',
            name: 'SEPE Minimum Hours Compliance',
            type: 'regulatory',
            priority: 10,
            weight: 1.0,
            condition: (partner, context, schedule) => {
                if (!schedule) return 1.0; // Pre-scheduling check
                const totalHours = schedule.visits?.reduce((sum, visit) => sum + visit.duration, 0) || 0;
                const requiredHours = context.regulatoryRequirements?.minimumHoursPerMonth || 20;
                return totalHours >= requiredHours ? 1.0 : 0.0;
            },
            action: 'hard_constraint',
            description: 'Schedule must meet SEPE minimum hours requirement'
        });

        // Professional qualification rules
        this.rules.push({
            id: 'professional_qualification',
            name: 'Professional Qualification Rule',
            type: 'regulatory',
            priority: 10,
            weight: 1.0,
            condition: (partner, context) => {
                const requiredSpecialty = context.installation?.service_type;
                const specialtyScore = this.calculateSpecialtyScore(partner, requiredSpecialty);
                return specialtyScore >= 0.8 ? 1.0 : 0.0; // Strict qualification requirement
            },
            action: 'hard_constraint',
            description: 'Partner must have appropriate professional qualifications'
        });

        // Visit frequency compliance
        this.rules.push({
            id: 'visit_frequency_compliance',
            name: 'Visit Frequency Compliance',
            type: 'regulatory',
            priority: 9,
            weight: 1.0,
            condition: (partner, context, schedule) => {
                if (!schedule) return 1.0;
                const requiredFrequency = context.regulatoryRequirements?.requiredVisitFrequency;
                
                if (requiredFrequency === 'weekly') {
                    const weeklyVisits = this.calculateAverageWeeklyVisits(schedule.visits);
                    return weeklyVisits >= 1 ? 1.0 : 0.0;
                } else if (requiredFrequency === 'monthly') {
                    const monthlyVisits = this.calculateAverageMonthlyVisits(schedule.visits);
                    return monthlyVisits >= 1 ? 1.0 : 0.0;
                }
                
                return 1.0; // No specific frequency required
            },
            action: 'schedule_constraint',
            description: 'Visit frequency must comply with regulatory requirements'
        });

        // Working hours compliance
        this.rules.push({
            id: 'working_hours_compliance',
            name: 'Working Hours Compliance',
            type: 'regulatory',
            priority: 8,
            weight: 1.0,
            condition: (partner, context, schedule) => {
                if (!schedule) return 1.0;
                const violations = schedule.visits?.filter(visit => 
                    !this.isWithinWorkingHours(visit, context.installation?.work_hours || '')
                ).length || 0;
                return violations === 0 ? 1.0 : 0.0;
            },
            action: 'schedule_constraint',
            description: 'All visits must be within installation working hours'
        });
    }

    /**
     * Load preference rules for optimization
     */
    loadPreferenceRules() {
        // Consistent scheduling preference
        this.rules.push({
            id: 'consistent_scheduling',
            name: 'Consistent Scheduling Preference',
            type: 'preference',
            priority: 4,
            weight: this.ruleWeights.consistent_scheduling || 0.10,
            condition: (partner, context, schedule) => {
                if (!schedule) return 1.0;
                
                const visitTimes = schedule.visits?.map(v => v.startTime) || [];
                const uniqueTimes = new Set(visitTimes);
                
                // Prefer consistent visit times
                if (uniqueTimes.size <= 2) return 1.0;
                if (uniqueTimes.size <= 3) return 0.8;
                return 0.6;
            },
            action: 'boost_score',
            description: 'Prefer consistent visit scheduling patterns'
        });

        // Avoid weekend scheduling preference
        this.rules.push({
            id: 'avoid_weekends',
            name: 'Avoid Weekend Scheduling',
            type: 'preference',
            priority: 3,
            weight: this.ruleWeights.avoid_weekends || 0.05,
            condition: (partner, context, schedule) => {
                if (!schedule) return 1.0;
                
                const weekendVisits = schedule.visits?.filter(visit => {
                    const date = new Date(visit.date);
                    return date.getDay() === 0 || date.getDay() === 6;
                }).length || 0;
                
                if (context.constraints?.excludeWeekends && weekendVisits > 0) {
                    return 0.0; // Hard constraint
                }
                
                return weekendVisits === 0 ? 1.0 : 0.7; // Preference
            },
            action: 'preference_score',
            description: 'Avoid scheduling visits on weekends when possible'
        });

        // Prefer morning visits
        this.rules.push({
            id: 'morning_preference',
            name: 'Morning Visit Preference',
            type: 'preference',
            priority: 2,
            weight: this.ruleWeights.morning_preference || 0.08,
            condition: (partner, context, schedule) => {
                if (!schedule) return 1.0;
                
                const morningVisits = schedule.visits?.filter(visit => {
                    const hour = parseInt(visit.startTime.split(':')[0]);
                    return hour >= 8 && hour <= 11;
                }).length || 0;
                
                const totalVisits = schedule.visits?.length || 1;
                const morningRatio = morningVisits / totalVisits;
                
                return morningRatio > 0.7 ? 1.0 : morningRatio;
            },
            action: 'preference_score',
            description: 'Prefer scheduling visits in the morning'
        });
    }

    /**
     * Initialize rule engine
     */
    initializeRuleEngine() {
        this.ruleEngine = {
            evaluateRules: (partner, context, schedule = null) => {
                const results = {
                    scores: {},
                    violations: [],
                    appliedRules: [],
                    totalScore: 0
                };

                let totalWeight = 0;
                let weightedScore = 0;

                for (const rule of this.rules) {
                    try {
                        const ruleResult = rule.condition(partner, context, schedule);
                        const ruleScore = Math.max(0, Math.min(1, ruleResult));

                        results.scores[rule.id] = {
                            score: ruleScore,
                            weight: rule.weight,
                            priority: rule.priority,
                            action: rule.action
                        };

                        results.appliedRules.push({
                            id: rule.id,
                            name: rule.name,
                            score: ruleScore,
                            weight: rule.weight
                        });

                        // Handle different rule actions
                        if (rule.action === 'hard_constraint' && ruleScore < 1.0) {
                            results.violations.push({
                                rule: rule.name,
                                severity: 'critical',
                                description: rule.description
                            });
                            
                            if (this.strictRules) {
                                results.totalScore = 0;
                                return results; // Fail immediately on hard constraint violation
                            }
                        } else if (rule.action === 'schedule_constraint' && ruleScore < 1.0) {
                            results.violations.push({
                                rule: rule.name,
                                severity: 'major',
                                description: rule.description
                            });
                        }

                        // Calculate weighted score
                        if (rule.action !== 'hard_constraint' || ruleScore >= 1.0) {
                            totalWeight += rule.weight;
                            weightedScore += ruleScore * rule.weight;
                        }

                    } catch (error) {
                        logger.warn(`Rule evaluation failed for ${rule.id}:`, error);
                        results.violations.push({
                            rule: rule.name,
                            severity: 'minor',
                            description: `Rule evaluation error: ${error.message}`
                        });
                    }
                }

                results.totalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
                return results;
            }
        };
    }

    /**
     * Evaluate all partners using rules
     */
    evaluatePartnersWithRules(context) {
        const evaluatedPartners = [];

        for (const partner of context.availablePartners) {
            const evaluation = this.ruleEngine.evaluateRules(partner, context);
            
            evaluatedPartners.push({
                partnerId: partner.id,
                partnerName: partner.name,
                partner: partner,
                totalScore: evaluation.totalScore,
                ruleScores: evaluation.scores,
                appliedRules: evaluation.appliedRules,
                violations: evaluation.violations
            });
        }

        return evaluatedPartners.sort((a, b) => b.totalScore - a.totalScore);
    }

    /**
     * Select optimal partner based on rule evaluation
     */
    selectOptimalPartner(evaluatedPartners, context) {
        if (evaluatedPartners.length === 0) {
            throw new Error('No partners passed rule evaluation');
        }

        // Filter out partners with critical violations in strict mode
        let eligiblePartners = evaluatedPartners;
        
        if (this.strictRules) {
            eligiblePartners = evaluatedPartners.filter(partner => 
                !partner.violations.some(v => v.severity === 'critical')
            );
        }

        if (eligiblePartners.length === 0) {
            if (this.flexibilityLevel === 'high') {
                logger.warn('No partners meet strict rules, relaxing constraints');
                eligiblePartners = evaluatedPartners;
            } else {
                throw new Error('No partners meet mandatory rule requirements');
            }
        }

        // Apply additional selection logic based on priority rules
        return this.applyPriorityRuleSelection(eligiblePartners, context);
    }

    /**
     * Apply priority rule selection logic
     */
    applyPriorityRuleSelection(partners, context) {
        let selectedPartner = partners[0]; // Start with highest scoring partner

        for (const priorityRule of this.priorityRules) {
            switch (priorityRule) {
                case 'historical_preference':
                    const historicalBest = this.selectByHistoricalPreference(partners, context);
                    if (historicalBest && historicalBest.totalScore >= selectedPartner.totalScore * 0.9) {
                        selectedPartner = historicalBest;
                    }
                    break;

                case 'cost_efficiency':
                    const costEfficient = this.selectByCostEfficiency(partners, context);
                    if (costEfficient && costEfficient.totalScore >= selectedPartner.totalScore * 0.9) {
                        selectedPartner = costEfficient;
                    }
                    break;

                case 'location_proximity':
                    const closest = this.selectByLocationProximity(partners, context);
                    if (closest && closest.totalScore >= selectedPartner.totalScore * 0.9) {
                        selectedPartner = closest;
                    }
                    break;
            }
        }

        return selectedPartner;
    }

    /**
     * Generate rule-based schedule
     */
    generateRuleBasedSchedule(selectedPartner, context) {
        // Use base scheduler to generate initial schedule
        const baseSchedule = this.generateVisitSchedule(
            selectedPartner.partner,
            context,
            context.contract?.start_date || new Date().toISOString(),
            context.contract?.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        );

        return {
            partnerId: selectedPartner.partnerId,
            partnerName: selectedPartner.partnerName,
            visits: baseSchedule.visits,
            totalHours: baseSchedule.totalHours,
            visitDuration: baseSchedule.visitDuration,
            visitsPerMonth: baseSchedule.visitsPerMonth
        };
    }

    /**
     * Apply rule-based optimizations to schedule
     */
    applyRuleBasedOptimizations(schedule, context) {
        let optimizedSchedule = { ...schedule };

        // Apply morning preference optimization
        if (this.ruleWeights.morning_preference > 0) {
            optimizedSchedule = this.optimizeForMorningPreference(optimizedSchedule, context);
        }

        // Apply consistent scheduling optimization
        if (this.ruleWeights.consistent_scheduling > 0) {
            optimizedSchedule = this.optimizeForConsistentScheduling(optimizedSchedule, context);
        }

        // Apply visit distribution optimization
        optimizedSchedule = this.optimizeVisitDistribution(optimizedSchedule, context);

        return optimizedSchedule;
    }

    /**
     * Validate schedule against all rules
     */
    validateScheduleAgainstRules(schedule, context) {
        const partner = context.availablePartners.find(p => p.id === schedule.partnerId);
        if (!partner) {
            return {
                compliant: false,
                complianceScore: 0,
                violations: [{ rule: 'Partner Validation', severity: 'critical', description: 'Selected partner not found' }]
            };
        }

        const evaluation = this.ruleEngine.evaluateRules(partner, context, schedule);

        return {
            compliant: evaluation.violations.filter(v => v.severity === 'critical').length === 0,
            complianceScore: evaluation.totalScore,
            violations: evaluation.violations,
            ruleScores: evaluation.scores
        };
    }

    /**
     * Calculate rule-based confidence
     */
    calculateRuleBasedConfidence(selectedPartner, ruleValidation) {
        let confidence = selectedPartner.totalScore;

        // Boost confidence if no violations
        if (ruleValidation.violations.length === 0) {
            confidence += 0.1;
        }

        // Reduce confidence for violations
        const criticalViolations = ruleValidation.violations.filter(v => v.severity === 'critical').length;
        const majorViolations = ruleValidation.violations.filter(v => v.severity === 'major').length;

        confidence -= criticalViolations * 0.3;
        confidence -= majorViolations * 0.1;

        return Math.max(0.0, Math.min(1.0, confidence));
    }

    // Helper methods for rule evaluation
    calculatePartnerAvailableHours(partner) {
        if (!partner.partner_availability || partner.partner_availability.length === 0) {
            return partner.max_weekly_hours || 40;
        }

        return partner.partner_availability.reduce((total, availability) => {
            return total + (availability.available_hours - availability.booked_hours);
        }, 0);
    }

    calculatePartnerCurrentWorkload(partner) {
        if (!partner.partner_availability || partner.partner_availability.length === 0) {
            return 20; // Default assumption
        }

        return partner.partner_availability.reduce((total, availability) => {
            return total + availability.booked_hours;
        }, 0);
    }

    getClientFeedbackScore(partner, installation) {
        // Placeholder for client feedback scoring
        // In production, this would query feedback data
        return Math.random() * 0.3 + 0.7; // Random score between 0.7-1.0
    }

    calculateAverageWeeklyVisits(visits) {
        if (!visits || visits.length === 0) return 0;
        
        const dateRange = this.getDateRange(visits);
        const weeks = Math.max(1, dateRange / 7);
        return visits.length / weeks;
    }

    calculateAverageMonthlyVisits(visits) {
        if (!visits || visits.length === 0) return 0;
        
        const dateRange = this.getDateRange(visits);
        const months = Math.max(1, dateRange / 30);
        return visits.length / months;
    }

    getDateRange(visits) {
        if (!visits || visits.length === 0) return 30;
        
        const dates = visits.map(v => new Date(v.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        return Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));
    }

    // Priority rule selection methods
    selectByHistoricalPreference(partners, context) {
        return partners.reduce((best, current) => {
            const bestHistorical = best.ruleScores.historical_success?.score || 0;
            const currentHistorical = current.ruleScores.historical_success?.score || 0;
            return currentHistorical > bestHistorical ? current : best;
        });
    }

    selectByCostEfficiency(partners, context) {
        return partners.reduce((best, current) => {
            const bestCost = best.ruleScores.cost_efficiency?.score || 0;
            const currentCost = current.ruleScores.cost_efficiency?.score || 0;
            return currentCost > bestCost ? current : best;
        });
    }

    selectByLocationProximity(partners, context) {
        return partners.reduce((best, current) => {
            const bestLocation = best.ruleScores.location_proximity?.score || 0;
            const currentLocation = current.ruleScores.location_proximity?.score || 0;
            return currentLocation > bestLocation ? current : best;
        });
    }

    // Schedule optimization methods
    optimizeForMorningPreference(schedule, context) {
        const optimized = { ...schedule };
        const workingHours = context.installation?.work_hours || '';
        const timeMatch = workingHours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
        
        if (timeMatch) {
            const startHour = parseInt(timeMatch[1]);
            const preferredTime = `${Math.max(startHour, 9).toString().padStart(2, '0')}:00:00`;
            
            optimized.visits = optimized.visits.map(visit => ({
                ...visit,
                startTime: preferredTime,
                endTime: this.addHours(preferredTime, visit.duration)
            }));
        }
        
        return optimized;
    }

    optimizeForConsistentScheduling(schedule, context) {
        const optimized = { ...schedule };
        
        if (optimized.visits.length > 0) {
            // Use the most common start time
            const timeFrequency = {};
            optimized.visits.forEach(visit => {
                timeFrequency[visit.startTime] = (timeFrequency[visit.startTime] || 0) + 1;
            });
            
            const mostCommonTime = Object.keys(timeFrequency)
                .reduce((a, b) => timeFrequency[a] > timeFrequency[b] ? a : b);
            
            optimized.visits = optimized.visits.map(visit => ({
                ...visit,
                startTime: mostCommonTime,
                endTime: this.addHours(mostCommonTime, visit.duration)
            }));
        }
        
        return optimized;
    }

    optimizeVisitDistribution(schedule, context) {
        // Ensure visits are well-distributed across the time period
        const optimized = { ...schedule };
        
        if (optimized.visits.length <= 1) return optimized;
        
        // Sort visits by date
        optimized.visits.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Check for visits that are too close together
        for (let i = 1; i < optimized.visits.length; i++) {
            const prevDate = new Date(optimized.visits[i - 1].date);
            const currentDate = new Date(optimized.visits[i].date);
            const daysDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
            
            // If visits are less than 3 days apart, spread them out
            if (daysDiff < 3) {
                const newDate = new Date(prevDate);
                newDate.setDate(newDate.getDate() + 7); // Move to next week
                optimized.visits[i].date = newDate.toISOString().split('T')[0];
            }
        }
        
        return optimized;
    }

    correctRuleViolations(schedule, violations, context) {
        // Placeholder for rule-based violation correction
        // In production, this would implement specific fixes for each violation type
        return null;
    }
}

module.exports = RuleBasedScheduler;