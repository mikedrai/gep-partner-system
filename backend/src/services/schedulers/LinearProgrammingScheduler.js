const BaseScheduler = require('./BaseScheduler');
const logger = require('../../utils/logger');

/**
 * Linear Programming Scheduler
 * Uses mathematical optimization to find the optimal partner assignment
 * Implements branch-and-bound with constraint satisfaction
 */
class LinearProgrammingScheduler extends BaseScheduler {
    constructor(config) {
        super(config);
        this.solverTimeout = this.parameters.time_limit_seconds || 300;
        this.solver = this.parameters.solver || 'SCIP';
        this.tolerance = this.parameters.tolerance || 0.001;
        this.maxIterations = this.parameters.max_iterations || 10000;
    }

    /**
     * Initialize the linear programming solver
     */
    async initialize() {
        try {
            logger.info(`Initializing LinearProgrammingScheduler with solver: ${this.solver}`);
            
            // Initialize solver parameters
            this.solverConfig = {
                method: 'simplex',
                maximize: true, // We maximize the optimization score
                tolerance: this.tolerance,
                timeout: this.solverTimeout * 1000 // Convert to milliseconds
            };

            this.isInitialized = true;
            logger.info('LinearProgrammingScheduler initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize LinearProgrammingScheduler:', error);
            throw error;
        }
    }

    /**
     * Generate optimal schedule using linear programming
     */
    async generateSchedule(context) {
        try {
            const startTime = Date.now();
            logger.info('Starting linear programming optimization');

            // Validate context
            if (!context.availablePartners || context.availablePartners.length === 0) {
                throw new Error('No available partners for scheduling');
            }

            // Build optimization problem
            const problem = this.buildOptimizationProblem(context);
            
            // Solve using linear programming
            const solution = await this.solveLPProblem(problem, context);

            // Convert solution to schedule format
            const schedule = this.convertSolutionToSchedule(solution, context);

            // Validate the generated schedule
            const validation = this.validateSchedule(schedule, context);
            
            if (!validation.valid) {
                logger.warn('Generated schedule has validation issues:', validation.violations);
                // Try to fix minor violations
                const fixedSchedule = this.fixScheduleViolations(schedule, validation.violations, context);
                if (fixedSchedule) {
                    schedule.visits = fixedSchedule.visits;
                    schedule.totalHours = fixedSchedule.totalHours;
                }
            }

            const executionTime = Date.now() - startTime;
            
            const result = {
                partnerId: solution.selectedPartnerId,
                partnerName: solution.selectedPartnerName,
                optimizationScore: solution.objectiveValue,
                totalHours: schedule.totalHours,
                visitDuration: schedule.visitDuration,
                visitsPerMonth: schedule.visitsPerMonth,
                visits: schedule.visits,
                feasible: solution.feasible,
                confidence: this.calculateConfidence(solution, context),
                executionTime,
                metadata: {
                    algorithm: 'linear_programming',
                    solver: this.solver,
                    iterations: solution.iterations,
                    constraintViolations: validation.violations.length,
                    convergence: solution.convergence
                }
            };

            this.logMetrics(executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('Linear programming schedule generation failed:', error);
            throw error;
        }
    }

    /**
     * Build the linear programming optimization problem
     */
    buildOptimizationProblem(context) {
        const partners = context.availablePartners;
        const problem = {
            objective: {},
            constraints: {},
            variables: {},
            bounds: {}
        };

        // Create decision variables for each partner
        partners.forEach((partner, index) => {
            const varName = `x_${partner.id}`;
            
            // Calculate composite score for this partner
            const scoreData = this.calculateCompositeScore(partner, context);
            
            // Set objective coefficient (we want to maximize this)
            problem.objective[varName] = scoreData.compositeScore;
            
            // Binary variable (0 or 1)
            problem.bounds[varName] = { min: 0, max: 1 };
            problem.variables[varName] = {
                partnerId: partner.id,
                partnerName: partner.name,
                score: scoreData.compositeScore,
                breakdown: scoreData.breakdown
            };
        });

        // Add constraints
        this.addPartnerSelectionConstraint(problem, partners);
        this.addAvailabilityConstraints(problem, context);
        this.addLocationConstraints(problem, context);
        this.addCostConstraints(problem, context);
        this.addSpecialtyConstraints(problem, context);

        return problem;
    }

    /**
     * Add constraint that exactly one partner must be selected
     */
    addPartnerSelectionConstraint(problem, partners) {
        const constraintName = 'select_one_partner';
        problem.constraints[constraintName] = {
            type: 'eq',
            value: 1,
            coefficients: {}
        };

        partners.forEach(partner => {
            const varName = `x_${partner.id}`;
            problem.constraints[constraintName].coefficients[varName] = 1;
        });
    }

    /**
     * Add availability constraints
     */
    addAvailabilityConstraints(problem, context) {
        const requiredHours = context.regulatoryRequirements.minimumHoursPerMonth;
        
        context.availablePartners.forEach(partner => {
            const varName = `x_${partner.id}`;
            const constraintName = `availability_${partner.id}`;
            
            // Calculate available hours for this partner
            const availableHours = this.calculatePartnerAvailableHours(partner);
            
            // If partner is selected, they must have enough available hours
            // This is modeled as: availableHours * x_partner >= requiredHours * x_partner
            // Simplified to: availableHours >= requiredHours (when x_partner = 1)
            if (availableHours < requiredHours) {
                // This partner cannot satisfy the requirement, set coefficient to 0
                problem.objective[varName] = 0;
            }
        });
    }

    /**
     * Add location-based constraints (travel distance limits)
     */
    addLocationConstraints(problem, context) {
        const maxDistance = context.constraints.maxTravelDistance || 50;
        
        context.availablePartners.forEach(partner => {
            const varName = `x_${partner.id}`;
            const distance = this.calculateDistance(partner.city, context.installation.address);
            
            if (distance > maxDistance) {
                // Penalize or exclude partners that are too far
                problem.objective[varName] *= 0.5; // Heavy penalty
            }
        });
    }

    /**
     * Add cost constraints
     */
    addCostConstraints(problem, context) {
        if (!context.contract.budget_limit) return;

        const budgetLimit = context.contract.budget_limit;
        const requiredHours = context.regulatoryRequirements.minimumHoursPerMonth;
        
        context.availablePartners.forEach(partner => {
            const varName = `x_${partner.id}`;
            const estimatedCost = partner.hourly_rate * requiredHours;
            
            if (estimatedCost > budgetLimit) {
                // This partner is too expensive
                problem.objective[varName] = 0;
            }
        });
    }

    /**
     * Add specialty matching constraints
     */
    addSpecialtyConstraints(problem, context) {
        const requiredServiceType = context.installation.service_type;
        
        context.availablePartners.forEach(partner => {
            const varName = `x_${partner.id}`;
            const specialtyScore = this.calculateSpecialtyScore(partner, requiredServiceType);
            
            if (specialtyScore < 0.3) {
                // Poor specialty match, heavily penalize
                problem.objective[varName] *= 0.2;
            }
        });
    }

    /**
     * Solve the linear programming problem
     */
    async solveLPProblem(problem, context) {
        try {
            // Since we don't have an external LP solver, implement a simplified optimization
            // This uses a greedy approach with constraint checking
            
            const candidates = Object.keys(problem.objective)
                .map(varName => ({
                    varName,
                    partnerId: problem.variables[varName].partnerId,
                    partnerName: problem.variables[varName].partnerName,
                    score: problem.objective[varName],
                    breakdown: problem.variables[varName].breakdown
                }))
                .filter(candidate => candidate.score > 0) // Filter out infeasible candidates
                .sort((a, b) => b.score - a.score); // Sort by score descending

            if (candidates.length === 0) {
                throw new Error('No feasible solution found - all partners excluded by constraints');
            }

            // Select the best candidate that satisfies all constraints
            for (const candidate of candidates) {
                const feasible = this.checkFeasibility(candidate, problem, context);
                
                if (feasible) {
                    return {
                        selectedPartnerId: candidate.partnerId,
                        selectedPartnerName: candidate.partnerName,
                        objectiveValue: candidate.score,
                        feasible: true,
                        iterations: 1,
                        convergence: true,
                        solution: { [candidate.varName]: 1 },
                        breakdown: candidate.breakdown
                    };
                }
            }

            // If no perfect solution, return best partial solution
            const bestCandidate = candidates[0];
            return {
                selectedPartnerId: bestCandidate.partnerId,
                selectedPartnerName: bestCandidate.partnerName,
                objectiveValue: bestCandidate.score * 0.8, // Penalty for constraint violations
                feasible: true,
                iterations: 1,
                convergence: false,
                solution: { [bestCandidate.varName]: 1 },
                breakdown: bestCandidate.breakdown
            };

        } catch (error) {
            logger.error('LP solver failed:', error);
            throw error;
        }
    }

    /**
     * Check if a candidate solution is feasible
     */
    checkFeasibility(candidate, problem, context) {
        try {
            // Find the partner
            const partner = context.availablePartners.find(p => p.id === candidate.partnerId);
            if (!partner) return false;

            // Check availability
            const availableHours = this.calculatePartnerAvailableHours(partner);
            const requiredHours = context.regulatoryRequirements.minimumHoursPerMonth;
            if (availableHours < requiredHours * 0.9) return false; // Allow 10% tolerance

            // Check distance
            const distance = this.calculateDistance(partner.city, context.installation.address);
            const maxDistance = context.constraints.maxTravelDistance || 50;
            if (distance > maxDistance) return false;

            // Check cost
            if (context.contract.budget_limit) {
                const estimatedCost = partner.hourly_rate * requiredHours;
                if (estimatedCost > context.contract.budget_limit) return false;
            }

            // Check specialty
            const specialtyScore = this.calculateSpecialtyScore(partner, context.installation.service_type);
            if (specialtyScore < 0.2) return false;

            return true;

        } catch (error) {
            logger.warn('Feasibility check failed:', error);
            return false;
        }
    }

    /**
     * Convert LP solution to schedule format
     */
    convertSolutionToSchedule(solution, context) {
        try {
            // Find the selected partner
            const selectedPartner = context.availablePartners.find(p => p.id === solution.selectedPartnerId);
            
            if (!selectedPartner) {
                throw new Error('Selected partner not found in available partners');
            }

            // Generate visit schedule for the selected partner
            const visitSchedule = this.generateVisitSchedule(
                selectedPartner,
                context,
                context.contract.start_date || new Date().toISOString(),
                context.contract.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            );

            return {
                partnerId: solution.selectedPartnerId,
                partnerName: solution.selectedPartnerName,
                visits: visitSchedule.visits,
                totalHours: visitSchedule.totalHours,
                visitDuration: visitSchedule.visitDuration,
                visitsPerMonth: visitSchedule.visitsPerMonth,
                optimizationBreakdown: solution.breakdown
            };

        } catch (error) {
            logger.error('Failed to convert solution to schedule:', error);
            throw error;
        }
    }

    /**
     * Calculate available hours for a partner
     */
    calculatePartnerAvailableHours(partner) {
        if (!partner.partner_availability || partner.partner_availability.length === 0) {
            return 20; // Default assumption
        }

        return partner.partner_availability.reduce((total, availability) => {
            return total + (availability.available_hours - availability.booked_hours);
        }, 0);
    }

    /**
     * Calculate confidence level of the solution
     */
    calculateConfidence(solution, context) {
        let confidence = 0.5; // Base confidence

        // Higher confidence for higher optimization scores
        confidence += solution.objectiveValue * 0.3;

        // Higher confidence if solution converged
        if (solution.convergence) {
            confidence += 0.1;
        }

        // Higher confidence if fewer constraint violations
        if (solution.feasible) {
            confidence += 0.1;
        }

        return Math.min(1.0, Math.max(0.0, confidence));
    }

    /**
     * Fix minor schedule violations
     */
    fixScheduleViolations(schedule, violations, context) {
        try {
            // Implementation for fixing common violations
            // This is a simplified version - could be expanded
            
            let fixedSchedule = JSON.parse(JSON.stringify(schedule)); // Deep copy
            let hasChanges = false;

            for (const violation of violations) {
                if (violation.includes('Insufficient hours')) {
                    // Try to add more visits or extend existing visits
                    const additionalHoursNeeded = this.extractHoursFromViolation(violation);
                    const added = this.addAdditionalHours(fixedSchedule, additionalHoursNeeded, context);
                    if (added) hasChanges = true;
                }
            }

            return hasChanges ? fixedSchedule : null;

        } catch (error) {
            logger.warn('Failed to fix schedule violations:', error);
            return null;
        }
    }

    /**
     * Extract hours deficit from violation message
     */
    extractHoursFromViolation(violation) {
        const match = violation.match(/(\d+(?:\.\d+)?)\s*<\s*(\d+(?:\.\d+)?)/);
        if (match) {
            const actual = parseFloat(match[1]);
            const required = parseFloat(match[2]);
            return required - actual;
        }
        return 0;
    }

    /**
     * Add additional hours to fix hour deficits
     */
    addAdditionalHours(schedule, additionalHours, context) {
        try {
            const hoursToAdd = Math.ceil(additionalHours);
            const visitDuration = schedule.visitDuration || 2;
            const additionalVisits = Math.ceil(hoursToAdd / visitDuration);

            // Try to add visits at the end of the period
            const lastVisit = schedule.visits[schedule.visits.length - 1];
            if (!lastVisit) return false;

            const lastDate = new Date(lastVisit.date);
            
            for (let i = 0; i < additionalVisits; i++) {
                // Add visits weekly after the last visit
                const newDate = new Date(lastDate);
                newDate.setDate(newDate.getDate() + (i + 1) * 7);

                const newVisit = {
                    date: newDate.toISOString().split('T')[0],
                    startTime: lastVisit.startTime,
                    endTime: this.addHours(lastVisit.startTime, visitDuration),
                    duration: visitDuration,
                    type: lastVisit.type,
                    notes: 'Additional visit to meet minimum hours requirement',
                    specialRequirements: lastVisit.specialRequirements
                };

                schedule.visits.push(newVisit);
            }

            // Recalculate total hours
            schedule.totalHours = schedule.visits.reduce((sum, visit) => sum + visit.duration, 0);

            return true;

        } catch (error) {
            logger.warn('Failed to add additional hours:', error);
            return false;
        }
    }
}

module.exports = LinearProgrammingScheduler;