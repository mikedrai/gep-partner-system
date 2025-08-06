const BaseScheduler = require('./BaseScheduler');
const logger = require('../../utils/logger');

/**
 * Genetic Algorithm Scheduler
 * Uses evolutionary optimization to find optimal partner assignments and schedules
 * Implements selection, crossover, and mutation operations
 */
class GeneticAlgorithmScheduler extends BaseScheduler {
    constructor(config) {
        super(config);
        this.populationSize = this.parameters.population_size || 50;
        this.generations = this.parameters.generations || 100;
        this.mutationRate = this.parameters.mutation_rate || 0.1;
        this.crossoverRate = this.parameters.crossover_rate || 0.8;
        this.eliteSize = this.parameters.elite_size || Math.floor(this.populationSize * 0.1);
        this.tournamentSize = this.parameters.tournament_size || 5;
        this.convergenceThreshold = this.parameters.convergence_threshold || 0.001;
        this.maxStagnantGenerations = this.parameters.max_stagnant_generations || 20;
    }

    /**
     * Initialize the genetic algorithm scheduler
     */
    async initialize() {
        try {
            logger.info('Initializing GeneticAlgorithmScheduler');
            
            // Initialize random number generator with seed for reproducibility
            this.random = this.createSeededRandom(this.parameters.seed || Date.now());
            
            // Validate parameters
            this.validateParameters();
            
            this.isInitialized = true;
            logger.info('GeneticAlgorithmScheduler initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize GeneticAlgorithmScheduler:', error);
            throw error;
        }
    }

    /**
     * Generate optimal schedule using genetic algorithm
     */
    async generateSchedule(context) {
        try {
            const startTime = Date.now();
            logger.info('Starting genetic algorithm optimization');

            // Validate context
            if (!context.availablePartners || context.availablePartners.length === 0) {
                throw new Error('No available partners for scheduling');
            }

            // Initialize population
            let population = this.initializePopulation(context);
            
            // Evolution loop
            let bestFitness = -Infinity;
            let stagnantGenerations = 0;
            let generation = 0;
            
            for (generation = 0; generation < this.generations; generation++) {
                // Evaluate fitness for all individuals
                population = this.evaluatePopulation(population, context);
                
                // Track best fitness
                const currentBest = Math.max(...population.map(ind => ind.fitness));
                
                if (currentBest > bestFitness + this.convergenceThreshold) {
                    bestFitness = currentBest;
                    stagnantGenerations = 0;
                } else {
                    stagnantGenerations++;
                }

                // Check for early convergence
                if (stagnantGenerations >= this.maxStagnantGenerations) {
                    logger.info(`Converged after ${generation} generations (${stagnantGenerations} stagnant)`);
                    break;
                }

                // Evolve population
                population = this.evolvePopulation(population, context);

                // Log progress every 10 generations
                if (generation % 10 === 0) {
                    logger.debug(`Generation ${generation}: Best fitness = ${bestFitness.toFixed(4)}`);
                }
            }

            // Select best individual
            const finalPopulation = this.evaluatePopulation(population, context);
            const bestIndividual = this.selectBestIndividual(finalPopulation);

            // Convert to schedule format
            const schedule = this.convertToSchedule(bestIndividual, context);

            // Validate the generated schedule
            const validation = this.validateSchedule(schedule, context);
            
            if (!validation.valid) {
                logger.warn('Generated schedule has validation issues:', validation.violations);
            }

            const executionTime = Date.now() - startTime;
            
            const result = {
                partnerId: bestIndividual.partnerId,
                partnerName: bestIndividual.partnerName,
                optimizationScore: bestIndividual.fitness,
                totalHours: schedule.totalHours,
                visitDuration: schedule.visitDuration,
                visitsPerMonth: schedule.visitsPerMonth,
                visits: schedule.visits,
                feasible: bestIndividual.fitness > 0,
                confidence: this.calculateConfidence(bestIndividual, generation),
                executionTime,
                metadata: {
                    algorithm: 'genetic_algorithm',
                    generations: generation + 1,
                    populationSize: this.populationSize,
                    finalFitness: bestIndividual.fitness,
                    convergence: stagnantGenerations < this.maxStagnantGenerations,
                    constraintViolations: validation.violations.length,
                    geneticDiversity: this.calculateDiversity(finalPopulation)
                }
            };

            this.logMetrics(executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('Genetic algorithm schedule generation failed:', error);
            throw error;
        }
    }

    /**
     * Initialize the population with random individuals
     */
    initializePopulation(context) {
        const population = [];
        const partners = context.availablePartners;

        for (let i = 0; i < this.populationSize; i++) {
            // Create a random individual
            const individual = this.createRandomIndividual(partners, context);
            population.push(individual);
        }

        return population;
    }

    /**
     * Create a random individual (chromosome)
     */
    createRandomIndividual(partners, context) {
        // Select a random partner
        const partnerIndex = Math.floor(this.random() * partners.length);
        const selectedPartner = partners[partnerIndex];

        // Generate random schedule parameters
        const visitDuration = this.randomBetween(1, 6); // 1-6 hours per visit
        const visitsPerMonth = this.randomBetween(1, 8); // 1-8 visits per month
        
        // Generate visit dates with some randomness
        const visits = this.generateRandomVisits(selectedPartner, context, visitDuration, visitsPerMonth);

        return {
            partnerId: selectedPartner.id,
            partnerName: selectedPartner.name,
            partner: selectedPartner,
            visitDuration,
            visitsPerMonth,
            visits,
            genes: {
                partnerIndex,
                visitDuration,
                visitsPerMonth,
                visitTimes: visits.map(v => v.startTime),
                visitDates: visits.map(v => v.date)
            },
            fitness: 0 // Will be calculated later
        };
    }

    /**
     * Generate random visits for an individual
     */
    generateRandomVisits(partner, context, visitDuration, visitsPerMonth) {
        const visits = [];
        const startDate = new Date(context.contract?.start_date || Date.now());
        const endDate = new Date(context.contract?.end_date || Date.now() + 365 * 24 * 60 * 60 * 1000);
        
        const totalMonths = this.getMonthsBetween(startDate, endDate);
        const totalVisits = Math.ceil(totalMonths * visitsPerMonth);
        
        const daysBetween = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const intervalDays = Math.floor(daysBetween / totalVisits);

        let currentDate = new Date(startDate);

        for (let i = 0; i < totalVisits; i++) {
            // Add random variation to visit dates
            const randomOffset = this.randomBetween(-intervalDays * 0.3, intervalDays * 0.3);
            const visitDate = new Date(currentDate);
            visitDate.setDate(visitDate.getDate() + randomOffset);

            // Skip weekends if required
            while (context.constraints?.excludeWeekends && (visitDate.getDay() === 0 || visitDate.getDay() === 6)) {
                visitDate.setDate(visitDate.getDate() + 1);
            }

            // Random visit time within working hours
            const startTime = this.generateRandomVisitTime(context.installation?.work_hours);
            
            visits.push({
                date: visitDate.toISOString().split('T')[0],
                startTime: startTime,
                endTime: this.addHours(startTime, visitDuration),
                duration: visitDuration,
                type: context.installation?.service_type || 'occupational_doctor',
                notes: `Generated visit for ${partner.name}`,
                specialRequirements: context.installation?.special_requirements || null
            });

            // Move to next interval
            currentDate.setDate(currentDate.getDate() + intervalDays);
            
            if (currentDate > endDate) break;
        }

        return visits;
    }

    /**
     * Generate random visit time within working hours
     */
    generateRandomVisitTime(workingHours) {
        if (!workingHours) return '10:00:00';

        const timeMatch = workingHours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
        if (!timeMatch) return '10:00:00';

        const startHour = parseInt(timeMatch[1]);
        const endHour = parseInt(timeMatch[3]);
        
        const randomHour = this.randomBetween(startHour, endHour - 2);
        const randomMinute = this.randomBetween(0, 3) * 15; // 0, 15, 30, 45 minutes
        
        return `${randomHour.toString().padStart(2, '0')}:${randomMinute.toString().padStart(2, '0')}:00`;
    }

    /**
     * Evaluate fitness for entire population
     */
    evaluatePopulation(population, context) {
        return population.map(individual => {
            individual.fitness = this.calculateFitness(individual, context);
            return individual;
        });
    }

    /**
     * Calculate fitness for an individual
     */
    calculateFitness(individual, context) {
        try {
            // Base fitness from partner scoring
            const scoreData = this.calculateCompositeScore(individual.partner, context);
            let fitness = scoreData.compositeScore;

            // Schedule quality bonus/penalty
            const scheduleQuality = this.evaluateScheduleQuality(individual, context);
            fitness *= scheduleQuality;

            // Regulatory compliance check
            const regulatoryScore = this.evaluateRegulatoryCompliance(individual, context);
            fitness *= regulatoryScore;

            // Constraint violation penalties
            const constraintPenalty = this.calculateConstraintPenalties(individual, context);
            fitness *= (1.0 - constraintPenalty);

            return Math.max(0, fitness);

        } catch (error) {
            logger.warn('Fitness calculation failed for individual:', error);
            return 0;
        }
    }

    /**
     * Evaluate schedule quality
     */
    evaluateScheduleQuality(individual, context) {
        let quality = 1.0;

        // Check visit distribution
        const visits = individual.visits;
        if (visits.length === 0) return 0;

        // Penalty for too many visits on same day
        const visitsByDate = {};
        visits.forEach(visit => {
            visitsByDate[visit.date] = (visitsByDate[visit.date] || 0) + 1;
        });
        
        const maxVisitsPerDay = Math.max(...Object.values(visitsByDate));
        if (maxVisitsPerDay > 2) {
            quality *= 0.8; // Penalty for overloaded days
        }

        // Bonus for consistent visit timing
        const visitTimes = visits.map(v => v.startTime);
        const uniqueTimes = new Set(visitTimes);
        if (uniqueTimes.size <= 2) {
            quality *= 1.1; // Bonus for consistent timing
        }

        // Check for reasonable visit duration
        const avgDuration = visits.reduce((sum, v) => sum + v.duration, 0) / visits.length;
        if (avgDuration >= 2 && avgDuration <= 4) {
            quality *= 1.05; // Bonus for reasonable duration
        }

        return quality;
    }

    /**
     * Evaluate regulatory compliance
     */
    evaluateRegulatoryCompliance(individual, context) {
        const requiredHours = context.regulatoryRequirements?.minimumHoursPerMonth || 20;
        const totalHours = individual.visits.reduce((sum, visit) => sum + visit.duration, 0);
        
        if (totalHours >= requiredHours) {
            return 1.0;
        } else if (totalHours >= requiredHours * 0.8) {
            return 0.9;
        } else {
            return Math.max(0.5, totalHours / requiredHours);
        }
    }

    /**
     * Calculate constraint violation penalties
     */
    calculateConstraintPenalties(individual, context) {
        let penalty = 0;

        // Check working hours violations
        const workingHoursViolations = individual.visits.filter(visit => 
            !this.isWithinWorkingHours(visit, context.installation?.work_hours || '')
        ).length;
        
        penalty += workingHoursViolations * 0.1;

        // Check weekend violations if weekends are excluded
        if (context.constraints?.excludeWeekends) {
            const weekendViolations = individual.visits.filter(visit => {
                const date = new Date(visit.date);
                return date.getDay() === 0 || date.getDay() === 6;
            }).length;
            
            penalty += weekendViolations * 0.15;
        }

        return Math.min(0.5, penalty); // Cap penalty at 50%
    }

    /**
     * Evolve the population using selection, crossover, and mutation
     */
    evolvePopulation(population, context) {
        // Sort by fitness (descending)
        population.sort((a, b) => b.fitness - a.fitness);

        const newPopulation = [];

        // Elitism: Keep best individuals
        for (let i = 0; i < this.eliteSize; i++) {
            newPopulation.push({ ...population[i] });
        }

        // Generate new individuals through crossover and mutation
        while (newPopulation.length < this.populationSize) {
            // Tournament selection
            const parent1 = this.tournamentSelection(population);
            const parent2 = this.tournamentSelection(population);

            // Crossover
            let offspring;
            if (this.random() < this.crossoverRate) {
                offspring = this.crossover(parent1, parent2, context);
            } else {
                offspring = this.random() < 0.5 ? { ...parent1 } : { ...parent2 };
            }

            // Mutation
            if (this.random() < this.mutationRate) {
                offspring = this.mutate(offspring, context);
            }

            newPopulation.push(offspring);
        }

        return newPopulation;
    }

    /**
     * Tournament selection
     */
    tournamentSelection(population) {
        const tournament = [];
        
        for (let i = 0; i < this.tournamentSize; i++) {
            const randomIndex = Math.floor(this.random() * population.length);
            tournament.push(population[randomIndex]);
        }

        tournament.sort((a, b) => b.fitness - a.fitness);
        return tournament[0];
    }

    /**
     * Crossover two parents to create offspring
     */
    crossover(parent1, parent2, context) {
        try {
            // Single-point crossover on genes
            const crossoverPoint = this.random();

            const offspring = {
                partnerId: crossoverPoint < 0.5 ? parent1.partnerId : parent2.partnerId,
                partnerName: crossoverPoint < 0.5 ? parent1.partnerName : parent2.partnerName,
                partner: crossoverPoint < 0.5 ? parent1.partner : parent2.partner,
                visitDuration: crossoverPoint < 0.3 ? parent1.visitDuration : parent2.visitDuration,
                visitsPerMonth: crossoverPoint < 0.7 ? parent1.visitsPerMonth : parent2.visitsPerMonth,
                fitness: 0
            };

            // Recombine visit schedules
            offspring.visits = this.crossoverVisits(parent1.visits, parent2.visits);
            
            // Update genes
            offspring.genes = {
                partnerIndex: context.availablePartners.findIndex(p => p.id === offspring.partnerId),
                visitDuration: offspring.visitDuration,
                visitsPerMonth: offspring.visitsPerMonth,
                visitTimes: offspring.visits.map(v => v.startTime),
                visitDates: offspring.visits.map(v => v.date)
            };

            return offspring;

        } catch (error) {
            logger.warn('Crossover failed, returning parent1:', error);
            return { ...parent1 };
        }
    }

    /**
     * Crossover visit schedules
     */
    crossoverVisits(visits1, visits2) {
        const maxLength = Math.max(visits1.length, visits2.length);
        const newVisits = [];

        for (let i = 0; i < maxLength; i++) {
            const visit1 = visits1[i];
            const visit2 = visits2[i];

            if (visit1 && visit2) {
                // Combine visits
                newVisits.push({
                    date: this.random() < 0.5 ? visit1.date : visit2.date,
                    startTime: this.random() < 0.5 ? visit1.startTime : visit2.startTime,
                    endTime: this.random() < 0.5 ? visit1.endTime : visit2.endTime,
                    duration: this.random() < 0.5 ? visit1.duration : visit2.duration,
                    type: visit1.type,
                    notes: visit1.notes,
                    specialRequirements: visit1.specialRequirements
                });
            } else if (visit1) {
                newVisits.push({ ...visit1 });
            } else if (visit2) {
                newVisits.push({ ...visit2 });
            }
        }

        return newVisits;
    }

    /**
     * Mutate an individual
     */
    mutate(individual, context) {
        try {
            const mutated = { ...individual };

            // Partner mutation (5% chance)
            if (this.random() < 0.05) {
                const randomPartnerIndex = Math.floor(this.random() * context.availablePartners.length);
                const newPartner = context.availablePartners[randomPartnerIndex];
                mutated.partnerId = newPartner.id;
                mutated.partnerName = newPartner.name;
                mutated.partner = newPartner;
            }

            // Visit duration mutation (20% chance)
            if (this.random() < 0.2) {
                mutated.visitDuration = Math.max(1, Math.min(6, 
                    mutated.visitDuration + this.randomBetween(-1, 1)
                ));
            }

            // Visits per month mutation (20% chance)
            if (this.random() < 0.2) {
                mutated.visitsPerMonth = Math.max(1, Math.min(8,
                    mutated.visitsPerMonth + this.randomBetween(-1, 1)
                ));
            }

            // Visit time mutations (30% chance per visit)
            mutated.visits = mutated.visits.map(visit => {
                if (this.random() < 0.3) {
                    const newStartTime = this.generateRandomVisitTime(context.installation?.work_hours);
                    return {
                        ...visit,
                        startTime: newStartTime,
                        endTime: this.addHours(newStartTime, visit.duration)
                    };
                }
                return visit;
            });

            // Regenerate visits if major changes
            if (this.random() < 0.1) {
                mutated.visits = this.generateRandomVisits(
                    mutated.partner, 
                    context, 
                    mutated.visitDuration, 
                    mutated.visitsPerMonth
                );
            }

            mutated.fitness = 0; // Reset fitness
            return mutated;

        } catch (error) {
            logger.warn('Mutation failed, returning original:', error);
            return individual;
        }
    }

    /**
     * Select the best individual from population
     */
    selectBestIndividual(population) {
        return population.reduce((best, current) => 
            current.fitness > best.fitness ? current : best, population[0]
        );
    }

    /**
     * Convert individual to schedule format
     */
    convertToSchedule(individual, context) {
        return {
            partnerId: individual.partnerId,
            partnerName: individual.partnerName,
            visits: individual.visits,
            totalHours: individual.visits.reduce((sum, visit) => sum + visit.duration, 0),
            visitDuration: individual.visitDuration,
            visitsPerMonth: individual.visitsPerMonth
        };
    }

    /**
     * Calculate confidence based on genetic algorithm performance
     */
    calculateConfidence(bestIndividual, generations) {
        let confidence = 0.5; // Base confidence

        // Higher confidence for higher fitness
        confidence += bestIndividual.fitness * 0.3;

        // Higher confidence if algorithm ran for sufficient generations
        if (generations >= this.generations * 0.8) {
            confidence += 0.1;
        }

        // Higher confidence if fitness is high
        if (bestIndividual.fitness > 0.8) {
            confidence += 0.1;
        }

        return Math.min(1.0, Math.max(0.0, confidence));
    }

    /**
     * Calculate genetic diversity of population
     */
    calculateDiversity(population) {
        if (population.length === 0) return 0;

        const uniquePartners = new Set(population.map(ind => ind.partnerId));
        const uniqueSchedules = new Set(population.map(ind => 
            `${ind.visitDuration}-${ind.visitsPerMonth}-${ind.visits.length}`
        ));

        const partnerDiversity = uniquePartners.size / population.length;
        const scheduleDiversity = uniqueSchedules.size / population.length;

        return (partnerDiversity + scheduleDiversity) / 2;
    }

    /**
     * Validate genetic algorithm parameters
     */
    validateParameters() {
        if (this.populationSize < 10) {
            throw new Error('Population size must be at least 10');
        }
        if (this.mutationRate < 0 || this.mutationRate > 1) {
            throw new Error('Mutation rate must be between 0 and 1');
        }
        if (this.crossoverRate < 0 || this.crossoverRate > 1) {
            throw new Error('Crossover rate must be between 0 and 1');
        }
    }

    /**
     * Create seeded random number generator
     */
    createSeededRandom(seed) {
        let m = 0x80000000; // 2**31
        let a = 1103515245;
        let c = 12345;
        let state = seed ? seed : Math.floor(Math.random() * (m - 1));
        
        return () => {
            state = (a * state + c) % m;
            return state / (m - 1);
        };
    }

    /**
     * Generate random number between min and max (inclusive)
     */
    randomBetween(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
}

module.exports = GeneticAlgorithmScheduler;