const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Visit Duration Optimizer
 * Automatically calculates optimal visit durations based on multiple factors:
 * - Installation size and complexity
 * - Partner availability and expertise
 * - Cost constraints and efficiency
 * - Proximity and travel considerations
 * - Historical performance data
 * - Regulatory requirements (SEPE)
 */
class VisitDurationOptimizer {
    constructor() {
        this.optimizationWeights = {
            installationSize: 0.25,      // Employee count, complexity
            partnerExpertise: 0.20,      // Experience, specialty match
            costEfficiency: 0.20,        // Budget constraints, hourly rates
            proximity: 0.15,             // Travel time, distance
            historicalData: 0.15,        // Past performance, success rates
            regulatoryCompliance: 0.05   // SEPE minimum requirements
        };
        
        this.baseDurations = {
            occupational_doctor: {
                min: 2,
                max: 6,
                default: 3
            },
            safety_engineer: {
                min: 3,
                max: 8,
                default: 4
            },
            specialist_consultation: {
                min: 1,
                max: 4,
                default: 2
            }
        };
        
        this.complexityMultipliers = {
            'A': 1.5,  // High-risk installations
            'B': 1.2,  // Medium-risk installations
            'C': 1.0   // Low-risk installations
        };
    }

    /**
     * Optimize visit duration for a specific context
     */
    async optimizeVisitDuration(context) {
        try {
            logger.info(`Optimizing visit duration for installation ${context.installation?.installation_code}`);

            // Calculate base duration from service type
            const baseDuration = this.calculateBaseDuration(context);
            
            // Apply optimization factors
            const installationFactor = this.calculateInstallationFactor(context);
            const partnerFactor = await this.calculatePartnerFactor(context);
            const costFactor = this.calculateCostFactor(context);
            const proximityFactor = this.calculateProximityFactor(context);
            const historicalFactor = await this.calculateHistoricalFactor(context);
            const regulatoryFactor = this.calculateRegulatoryFactor(context);

            // Calculate weighted optimization score
            const optimizationScore = 
                (installationFactor * this.optimizationWeights.installationSize) +
                (partnerFactor * this.optimizationWeights.partnerExpertise) +
                (costFactor * this.optimizationWeights.costEfficiency) +
                (proximityFactor * this.optimizationWeights.proximity) +
                (historicalFactor * this.optimizationWeights.historicalData) +
                (regulatoryFactor * this.optimizationWeights.regulatoryCompliance);

            // Apply optimization score to base duration
            const optimizedDuration = this.applyOptimizationScore(baseDuration, optimizationScore, context);

            // Generate multiple duration options
            const durationOptions = this.generateDurationOptions(optimizedDuration, context);

            // Calculate confidence level
            const confidence = this.calculateOptimizationConfidence(context, optimizationScore);

            const result = {
                optimizedDuration: Math.round(optimizedDuration * 10) / 10, // Round to 1 decimal
                baseDuration,
                optimizationScore,
                confidence,
                durationOptions,
                factors: {
                    installation: installationFactor,
                    partner: partnerFactor,
                    cost: costFactor,
                    proximity: proximityFactor,
                    historical: historicalFactor,
                    regulatory: regulatoryFactor
                },
                reasoning: this.generateOptimizationReasoning(context, optimizationScore),
                recommendations: this.generateDurationRecommendations(context, optimizedDuration)
            };

            logger.info(`Visit duration optimized: ${baseDuration}h → ${result.optimizedDuration}h (${(optimizationScore * 100).toFixed(1)}% confidence)`);
            return result;

        } catch (error) {
            logger.error('Visit duration optimization failed:', error);
            return this.getFallbackDuration(context);
        }
    }

    /**
     * Batch optimize durations for multiple contexts
     */
    async batchOptimizeDurations(contexts) {
        try {
            const optimizationPromises = contexts.map(context => 
                this.optimizeVisitDuration(context).catch(error => {
                    logger.warn(`Batch optimization failed for ${context.installation?.installation_code}:`, error);
                    return this.getFallbackDuration(context);
                })
            );

            const results = await Promise.all(optimizationPromises);
            
            return {
                optimizations: results,
                summary: this.generateBatchSummary(results),
                totalContexts: contexts.length,
                successfulOptimizations: results.filter(r => r.confidence > 0.5).length
            };

        } catch (error) {
            logger.error('Batch duration optimization failed:', error);
            throw error;
        }
    }

    /**
     * Get optimal duration for partner workload balancing
     */
    async optimizeForWorkloadBalance(partnerId, proposedDuration, existingWorkload) {
        try {
            const partner = await this.getPartnerDetails(partnerId);
            const currentUtilization = this.calculatePartnerUtilization(partner, existingWorkload);
            
            let adjustedDuration = proposedDuration;
            
            // Adjust based on workload
            if (currentUtilization > 0.9) {
                // Partner is overloaded, reduce duration
                adjustedDuration *= 0.8;
            } else if (currentUtilization < 0.6) {
                // Partner is underutilized, can handle longer visits
                adjustedDuration *= 1.2;
            }

            // Ensure duration stays within reasonable bounds
            const serviceType = partner.specialty || 'occupational_doctor';
            const bounds = this.baseDurations[serviceType] || this.baseDurations.occupational_doctor;
            adjustedDuration = Math.max(bounds.min, Math.min(bounds.max, adjustedDuration));

            return {
                originalDuration: proposedDuration,
                adjustedDuration: Math.round(adjustedDuration * 10) / 10,
                currentUtilization,
                adjustment: adjustedDuration / proposedDuration,
                reasoning: this.generateWorkloadReasoning(currentUtilization, adjustedDuration, proposedDuration)
            };

        } catch (error) {
            logger.error('Workload balance optimization failed:', error);
            return {
                originalDuration: proposedDuration,
                adjustedDuration: proposedDuration,
                currentUtilization: 0.75,
                adjustment: 1.0,
                reasoning: 'Workload optimization unavailable, using original duration'
            };
        }
    }

    /**
     * Calculate seasonal duration adjustments
     */
    calculateSeasonalAdjustments(context, baseDuration) {
        try {
            const currentMonth = new Date().getMonth() + 1;
            let seasonalMultiplier = 1.0;

            // Winter months (Dec, Jan, Feb) - longer visits due to weather, holidays
            if ([12, 1, 2].includes(currentMonth)) {
                seasonalMultiplier = 1.1;
            }
            // Summer months (Jul, Aug) - shorter visits due to vacations
            else if ([7, 8].includes(currentMonth)) {
                seasonalMultiplier = 0.95;
            }
            // Spring/Fall - optimal conditions
            else if ([3, 4, 5, 9, 10, 11].includes(currentMonth)) {
                seasonalMultiplier = 1.0;
            }

            // Additional adjustments for specific industries
            if (context.installation?.category === 'A') {
                // High-risk installations need more consistent coverage
                seasonalMultiplier = Math.max(0.98, seasonalMultiplier);
            }

            const adjustedDuration = baseDuration * seasonalMultiplier;

            return {
                originalDuration: baseDuration,
                seasonalDuration: Math.round(adjustedDuration * 10) / 10,
                seasonalMultiplier,
                month: currentMonth,
                reasoning: this.generateSeasonalReasoning(currentMonth, seasonalMultiplier)
            };

        } catch (error) {
            logger.warn('Seasonal adjustment calculation failed:', error);
            return {
                originalDuration: baseDuration,
                seasonalDuration: baseDuration,
                seasonalMultiplier: 1.0,
                month: new Date().getMonth() + 1,
                reasoning: 'Seasonal adjustment unavailable'
            };
        }
    }

    /**
     * Calculate base duration from service type
     */
    calculateBaseDuration(context) {
        const serviceType = context.installation?.service_type || 'occupational_doctor';
        const baseDurationConfig = this.baseDurations[serviceType] || this.baseDurations.occupational_doctor;
        return baseDurationConfig.default;
    }

    /**
     * Calculate installation complexity factor
     */
    calculateInstallationFactor(context) {
        const installation = context.installation;
        if (!installation) return 0.5;

        let factor = 0.5; // Base factor

        // Employee count factor
        const employeeCount = installation.employees_count || 50;
        if (employeeCount > 200) factor += 0.3;
        else if (employeeCount > 100) factor += 0.2;
        else if (employeeCount > 50) factor += 0.1;

        // Risk category factor
        const category = installation.category || 'C';
        const complexityMultiplier = this.complexityMultipliers[category] || 1.0;
        factor *= complexityMultiplier;

        // Special requirements factor
        if (installation.special_requirements && installation.special_requirements.length > 0) {
            factor += 0.1;
        }

        return Math.min(1.0, factor);
    }

    /**
     * Calculate partner expertise factor
     */
    async calculatePartnerFactor(context) {
        try {
            if (!context.selectedPartner && (!context.availablePartners || context.availablePartners.length === 0)) {
                return 0.5;
            }

            const partner = context.selectedPartner || context.availablePartners[0];
            let factor = 0.5;

            // Experience factor (based on historical data)
            const partnerHistory = await this.getPartnerExperienceData(partner.id);
            if (partnerHistory.totalAssignments > 50) factor += 0.2;
            else if (partnerHistory.totalAssignments > 20) factor += 0.15;
            else if (partnerHistory.totalAssignments > 5) factor += 0.1;

            // Specialty match factor
            const serviceType = context.installation?.service_type;
            const specialtyScore = this.calculateSpecialtyMatch(partner.specialty, serviceType);
            factor += specialtyScore * 0.3;

            // Success rate factor
            if (partnerHistory.successRate > 0.9) factor += 0.1;
            else if (partnerHistory.successRate > 0.8) factor += 0.05;

            return Math.min(1.0, factor);

        } catch (error) {
            logger.warn('Partner factor calculation failed:', error);
            return 0.5;
        }
    }

    /**
     * Calculate cost efficiency factor
     */
    calculateCostFactor(context) {
        try {
            const partner = context.selectedPartner || (context.availablePartners && context.availablePartners[0]);
            if (!partner) return 0.5;

            const hourlyRate = partner.hourly_rate || 50;
            const budget = context.contract?.budget_limit || context.contract?.contract_value;
            
            if (!budget) return 0.5;

            const requiredHours = context.regulatoryRequirements?.minimumHoursPerMonth || 20;
            const monthlyCost = hourlyRate * requiredHours;
            const costRatio = monthlyCost / (budget / 12); // Assuming annual budget

            // Lower cost ratio = higher efficiency factor
            if (costRatio <= 0.6) return 1.0;      // Very cost-efficient
            if (costRatio <= 0.8) return 0.8;      // Cost-efficient
            if (costRatio <= 1.0) return 0.6;      // Within budget
            if (costRatio <= 1.2) return 0.4;      // Slightly over budget
            return 0.2;                             // Expensive

        } catch (error) {
            logger.warn('Cost factor calculation failed:', error);
            return 0.5;
        }
    }

    /**
     * Calculate proximity factor
     */
    calculateProximityFactor(context) {
        try {
            const partner = context.selectedPartner || (context.availablePartners && context.availablePartners[0]);
            if (!partner) return 0.5;

            const distance = this.calculateDistance(
                partner.city || '',
                context.installation?.address || ''
            );

            // Closer distance = higher factor (allows for longer visits)
            if (distance <= 10) return 1.0;        // Very close
            if (distance <= 25) return 0.8;        // Close
            if (distance <= 50) return 0.6;        // Moderate distance
            if (distance <= 100) return 0.4;       // Far
            return 0.2;                             // Very far

        } catch (error) {
            logger.warn('Proximity factor calculation failed:', error);
            return 0.5;
        }
    }

    /**
     * Calculate historical performance factor
     */
    async calculateHistoricalFactor(context) {
        try {
            const installation = context.installation;
            if (!installation) return 0.5;

            const historicalData = await this.getHistoricalDurationData(installation.installation_code);
            
            if (historicalData.length === 0) return 0.5;

            // Calculate success rate of different durations
            const durationPerformance = this.analyzeDurationPerformance(historicalData);
            
            // Return factor based on historical success
            return Math.min(1.0, durationPerformance.averageSuccessRate + 0.1);

        } catch (error) {
            logger.warn('Historical factor calculation failed:', error);
            return 0.5;
        }
    }

    /**
     * Calculate regulatory compliance factor
     */
    calculateRegulatoryFactor(context) {
        try {
            const requirements = context.regulatoryRequirements;
            if (!requirements) return 0.5;

            let factor = 0.5;

            // Minimum hours compliance
            const minHours = requirements.minimumHoursPerMonth || 0;
            if (minHours > 0) {
                factor += 0.3; // Boost factor if there are minimum hour requirements
            }

            // Visit frequency requirements
            if (requirements.requiredVisitFrequency === 'weekly') {
                factor += 0.2; // More frequent visits may need shorter durations
            } else if (requirements.requiredVisitFrequency === 'monthly') {
                factor += 0.1; // Monthly visits can be longer
            }

            return Math.min(1.0, factor);

        } catch (error) {
            logger.warn('Regulatory factor calculation failed:', error);
            return 0.5;
        }
    }

    /**
     * Apply optimization score to base duration
     */
    applyOptimizationScore(baseDuration, optimizationScore, context) {
        // Convert optimization score to duration multiplier
        // Score of 0.5 = no change, >0.5 = longer visits, <0.5 = shorter visits
        const multiplier = 0.7 + (optimizationScore * 0.6); // Range: 0.7 to 1.3

        let optimizedDuration = baseDuration * multiplier;

        // Apply service type bounds
        const serviceType = context.installation?.service_type || 'occupational_doctor';
        const bounds = this.baseDurations[serviceType] || this.baseDurations.occupational_doctor;
        
        optimizedDuration = Math.max(bounds.min, Math.min(bounds.max, optimizedDuration));

        return optimizedDuration;
    }

    /**
     * Generate multiple duration options
     */
    generateDurationOptions(optimizedDuration, context) {
        const options = [];
        const serviceType = context.installation?.service_type || 'occupational_doctor';
        const bounds = this.baseDurations[serviceType] || this.baseDurations.occupational_doctor;

        // Conservative option (shorter)
        const conservative = Math.max(bounds.min, optimizedDuration * 0.85);
        options.push({
            duration: Math.round(conservative * 10) / 10,
            type: 'conservative',
            description: 'Shorter visits, more frequent scheduling',
            pros: ['Lower cost per visit', 'More flexibility', 'Reduced partner fatigue'],
            cons: ['Less thorough coverage', 'More scheduling complexity']
        });

        // Optimal option
        options.push({
            duration: Math.round(optimizedDuration * 10) / 10,
            type: 'optimal',
            description: 'AI-optimized duration based on all factors',
            pros: ['Balanced approach', 'Best efficiency', 'Optimal coverage'],
            cons: ['May require adjustment over time']
        });

        // Comprehensive option (longer)
        const comprehensive = Math.min(bounds.max, optimizedDuration * 1.15);
        options.push({
            duration: Math.round(comprehensive * 10) / 10,
            type: 'comprehensive',
            description: 'Longer visits, more thorough coverage',
            pros: ['Comprehensive coverage', 'Fewer visits needed', 'Better partner efficiency'],
            cons: ['Higher cost per visit', 'Less scheduling flexibility']
        });

        return options;
    }

    /**
     * Calculate optimization confidence
     */
    calculateOptimizationConfidence(context, optimizationScore) {
        let confidence = 0.5;

        // Boost confidence if we have good data
        if (context.installation) confidence += 0.1;
        if (context.selectedPartner || (context.availablePartners && context.availablePartners.length > 0)) confidence += 0.1;
        if (context.historicalData && context.historicalData.length > 0) confidence += 0.2;
        if (context.regulatoryRequirements) confidence += 0.1;

        // Adjust based on optimization score
        confidence *= (0.8 + optimizationScore * 0.4);

        return Math.min(1.0, Math.max(0.0, confidence));
    }

    /**
     * Generate optimization reasoning
     */
    generateOptimizationReasoning(context, optimizationScore) {
        const reasons = [];

        if (optimizationScore > 0.7) {
            reasons.push('High optimization confidence due to comprehensive data');
        } else if (optimizationScore > 0.5) {
            reasons.push('Moderate optimization confidence with available data');
        } else {
            reasons.push('Conservative optimization due to limited data');
        }

        if (context.installation?.employees_count > 100) {
            reasons.push('Larger installation requires more comprehensive visits');
        }

        if (context.installation?.category === 'A') {
            reasons.push('High-risk category installation needs thorough coverage');
        }

        const partner = context.selectedPartner || (context.availablePartners && context.availablePartners[0]);
        if (partner && partner.hourly_rate > 60) {
            reasons.push('Higher partner rates favor efficient visit duration');
        }

        return reasons.join('. ') + '.';
    }

    /**
     * Generate duration recommendations
     */
    generateDurationRecommendations(context, optimizedDuration) {
        const recommendations = [];

        const baseDuration = this.calculateBaseDuration(context);
        const change = optimizedDuration - baseDuration;

        if (Math.abs(change) < 0.5) {
            recommendations.push('Current duration is well-optimized');
        } else if (change > 0) {
            recommendations.push('Consider longer visits for better efficiency and coverage');
            if (change > 1) {
                recommendations.push('Significant duration increase recommended - review partner availability');
            }
        } else {
            recommendations.push('Shorter visits may improve cost efficiency');
            if (change < -1) {
                recommendations.push('Consider more frequent, shorter visits to maintain coverage');
            }
        }

        // Service-specific recommendations
        const serviceType = context.installation?.service_type;
        if (serviceType === 'safety_engineer') {
            recommendations.push('Safety assessments benefit from thorough, unrushed inspections');
        } else if (serviceType === 'occupational_doctor') {
            recommendations.push('Medical consultations should allow adequate time per employee');
        }

        return recommendations;
    }

    /**
     * Get fallback duration when optimization fails
     */
    getFallbackDuration(context) {
        const baseDuration = this.calculateBaseDuration(context);
        
        return {
            optimizedDuration: baseDuration,
            baseDuration,
            optimizationScore: 0.5,
            confidence: 0.3,
            durationOptions: this.generateDurationOptions(baseDuration, context),
            factors: {
                installation: 0.5,
                partner: 0.5,
                cost: 0.5,
                proximity: 0.5,
                historical: 0.5,
                regulatory: 0.5
            },
            reasoning: 'Fallback duration used due to optimization failure',
            recommendations: ['Manual review recommended', 'Gather more data for better optimization']
        };
    }

    // Helper methods
    calculateDistance(location1, location2) {
        // Simplified distance calculation for Greek cities
        const cityDistances = {
            'ΑΘΗΝΑ-ΚΑΛΛΙΘΕΑ': 8,
            'ΑΘΗΝΑ-ΓΕΡΑΚΑΣ': 25,
            'ΚΑΛΛΙΘΕΑ-ΓΕΡΑΚΑΣ': 30,
            'ΑΘΗΝΑ-ΑΘΗΝΑ': 0,
            'ΚΑΛΛΙΘΕΑ-ΚΑΛΛΙΘΕΑ': 0,
            'ΓΕΡΑΚΑΣ-ΓΕΡΑΚΑΣ': 0
        };

        const key = `${location1}-${location2}`;
        const reverseKey = `${location2}-${location1}`;
        
        return cityDistances[key] || cityDistances[reverseKey] || 20;
    }

    calculateSpecialtyMatch(partnerSpecialty, serviceType) {
        const specialtyMappings = {
            'occupational_doctor': ['Παθολόγος', 'Ιατρός', 'Ειδικός Ιατρός Εργασίας'],
            'safety_engineer': ['Μηχανικός', 'Ηλεκτρολόγος Μηχανικός', 'Μηχανολόγος Μηχανικός'],
            'specialist_consultation': ['Ειδικός Ιατρός Εργασίας', 'Παθολόγος']
        };

        const requiredSpecialties = specialtyMappings[serviceType] || [];
        
        if (requiredSpecialties.includes(partnerSpecialty)) return 1.0;
        
        for (const specialty of requiredSpecialties) {
            if (partnerSpecialty && partnerSpecialty.includes(specialty)) return 0.8;
        }
        
        return 0.3;
    }

    // Database helper methods (would be implemented with actual queries)
    async getPartnerExperienceData(partnerId) {
        // Placeholder - would query historical assignments
        return {
            totalAssignments: 15,
            successRate: 0.85,
            averageDuration: 3.2
        };
    }

    async getPartnerDetails(partnerId) {
        // Placeholder - would query partner details
        return {
            id: partnerId,
            specialty: 'Παθολόγος',
            hourly_rate: 55,
            max_weekly_hours: 40
        };
    }

    calculatePartnerUtilization(partner, existingWorkload) {
        const maxHours = partner.max_weekly_hours || 40;
        const currentHours = existingWorkload?.totalHours || 20;
        return currentHours / maxHours;
    }

    async getHistoricalDurationData(installationCode) {
        // Placeholder - would query historical schedule data
        return [];
    }

    analyzeDurationPerformance(historicalData) {
        // Placeholder - would analyze success rates by duration
        return {
            averageSuccessRate: 0.8,
            optimalDuration: 3.5
        };
    }

    generateBatchSummary(results) {
        const successful = results.filter(r => r.confidence > 0.5);
        const avgDuration = results.reduce((sum, r) => sum + r.optimizedDuration, 0) / results.length;
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

        return {
            successRate: successful.length / results.length,
            averageDuration: Math.round(avgDuration * 10) / 10,
            averageConfidence: Math.round(avgConfidence * 100) / 100,
            totalOptimizations: results.length
        };
    }

    generateWorkloadReasoning(utilization, adjusted, original) {
        if (adjusted > original) {
            return `Partner utilization is ${(utilization * 100).toFixed(1)}% - can handle longer visits`;
        } else if (adjusted < original) {
            return `Partner utilization is ${(utilization * 100).toFixed(1)}% - reducing visit duration to balance workload`;
        } else {
            return `Partner utilization is ${(utilization * 100).toFixed(1)}% - optimal duration maintained`;
        }
    }

    generateSeasonalReasoning(month, multiplier) {
        const seasons = {
            12: 'Winter', 1: 'Winter', 2: 'Winter',
            3: 'Spring', 4: 'Spring', 5: 'Spring',
            6: 'Summer', 7: 'Summer', 8: 'Summer',
            9: 'Fall', 10: 'Fall', 11: 'Fall'
        };

        const season = seasons[month] || 'Unknown';
        
        if (multiplier > 1.05) {
            return `${season} season requires longer visits due to seasonal factors`;
        } else if (multiplier < 0.95) {
            return `${season} season permits shorter visits due to optimal conditions`;
        } else {
            return `${season} season has minimal impact on visit duration`;
        }
    }
}

module.exports = VisitDurationOptimizer;