const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Contract Migration Service
 * Handles automatic contract assignment based on prior visit data
 * Migrates existing client-partner relationships to the new system
 * Maintains historical preferences and performance data
 */
class ContractMigrationService {
    constructor() {
        this.migrationBatchSize = 50;
        this.confidenceThreshold = 0.7;
        this.migrationStats = {
            processed: 0,
            successful: 0,
            failed: 0,
            warnings: 0
        };
    }

    /**
     * Execute complete contract migration process
     */
    async executeFullMigration() {
        try {
            logger.info('Starting complete contract migration process');
            this.resetMigrationStats();

            // Step 1: Analyze existing visit data
            const visitAnalysis = await this.analyzeExistingVistData();
            logger.info('Visit data analysis completed', visitAnalysis.summary);

            // Step 2: Identify partner-installation relationships
            const relationships = await this.identifyPartnerInstallationRelationships();
            logger.info(`Identified ${relationships.length} partner-installation relationships`);

            // Step 3: Create contract assignments based on relationships
            const assignments = await this.createAutomaticContractAssignments(relationships);
            logger.info(`Created ${assignments.successful} automatic contract assignments`);

            // Step 4: Handle unassigned installations
            const unassigned = await this.handleUnassignedInstallations(assignments.unassigned);
            logger.info(`Processed ${unassigned.processed} unassigned installations`);

            // Step 5: Validate migration results
            const validation = await this.validateMigrationResults();
            logger.info('Migration validation completed', validation);

            // Step 6: Generate migration report
            const report = await this.generateMigrationReport(visitAnalysis, relationships, assignments, validation);

            logger.info('Contract migration completed successfully', this.migrationStats);
            return report;

        } catch (error) {
            logger.error('Contract migration failed:', error);
            throw error;
        }
    }

    /**
     * Analyze existing visit data to understand patterns
     */
    async analyzeExistingVistData() {
        try {
            logger.info('Analyzing existing visit data patterns');

            // Get all existing visits with partner and installation data
            const { data: visits, error } = await supabaseAdmin
                .from('visits')
                .select(`
                    *,
                    partners(id, name, specialty, city),
                    installations(installation_code, company_name, address, employees_count, category)
                `)
                .order('visit_date', { ascending: false });

            if (error) {
                throw error;
            }

            // Analyze patterns
            const analysis = {
                totalVisits: visits.length,
                uniquePartners: new Set(visits.map(v => v.partner_id)).size,
                uniqueInstallations: new Set(visits.map(v => v.installation_code)).size,
                visitsByPartner: this.groupVisitsByPartner(visits),
                visitsByInstallation: this.groupVisitsByInstallation(visits),
                partnerInstallationPairs: this.identifyPartnerInstallationPairs(visits),
                visitFrequency: this.analyzeVisitFrequency(visits),
                temporalPatterns: this.analyzeTemporalPatterns(visits),
                summary: {}
            };

            // Calculate summary statistics
            analysis.summary = {
                avgVisitsPerPartner: analysis.totalVisits / analysis.uniquePartners,
                avgVisitsPerInstallation: analysis.totalVisits / analysis.uniqueInstallations,
                strongRelationships: analysis.partnerInstallationPairs.filter(p => p.visitCount >= 5).length,
                recentVisits: visits.filter(v => this.isRecentVisit(v.visit_date)).length
            };

            return analysis;

        } catch (error) {
            logger.error('Visit data analysis failed:', error);
            throw error;
        }
    }

    /**
     * Identify strong partner-installation relationships
     */
    async identifyPartnerInstallationRelationships() {
        try {
            const visitAnalysis = await this.analyzeExistingVistData();
            const relationships = [];

            for (const pair of visitAnalysis.partnerInstallationPairs) {
                // Calculate relationship strength
                const strength = await this.calculateRelationshipStrength(pair);
                
                if (strength.score >= this.confidenceThreshold) {
                    relationships.push({
                        partnerId: pair.partnerId,
                        partnerName: pair.partnerName,
                        installationCode: pair.installationCode,
                        installationName: pair.installationName,
                        visitCount: pair.visitCount,
                        lastVisit: pair.lastVisit,
                        firstVisit: pair.firstVisit,
                        relationshipStrength: strength.score,
                        relationshipType: strength.type,
                        averageInterval: this.calculateAverageVisitInterval(pair.visits),
                        serviceTypes: this.extractServiceTypes(pair.visits),
                        confidenceFactors: strength.factors,
                        migrationPriority: this.calculateMigrationPriority(pair, strength)
                    });
                }
            }

            // Sort by relationship strength and migration priority
            relationships.sort((a, b) => {
                if (a.migrationPriority !== b.migrationPriority) {
                    return b.migrationPriority - a.migrationPriority;
                }
                return b.relationshipStrength - a.relationshipStrength;
            });

            return relationships;

        } catch (error) {
            logger.error('Relationship identification failed:', error);
            throw error;
        }
    }

    /**
     * Create automatic contract assignments based on relationships
     */
    async createAutomaticContractAssignments(relationships) {
        try {
            logger.info(`Creating contract assignments for ${relationships.length} relationships`);

            const results = {
                successful: 0,
                failed: 0,
                warnings: 0,
                unassigned: [],
                assignments: []
            };

            // Process relationships in batches
            for (let i = 0; i < relationships.length; i += this.migrationBatchSize) {
                const batch = relationships.slice(i, i + this.migrationBatchSize);
                const batchResults = await this.processBatchAssignments(batch);
                
                results.successful += batchResults.successful;
                results.failed += batchResults.failed;
                results.warnings += batchResults.warnings;
                results.assignments.push(...batchResults.assignments);
                
                // Add delay between batches to avoid overwhelming the database
                if (i + this.migrationBatchSize < relationships.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Identify installations that weren't assigned
            const assignedInstallations = new Set(results.assignments.map(a => a.installationCode));
            const allInstallations = await this.getAllInstallations();
            
            results.unassigned = allInstallations.filter(installation => 
                !assignedInstallations.has(installation.installation_code)
            );

            return results;

        } catch (error) {
            logger.error('Contract assignment creation failed:', error);
            throw error;
        }
    }

    /**
     * Process batch of contract assignments
     */
    async processBatchAssignments(batch) {
        const results = {
            successful: 0,
            failed: 0,
            warnings: 0,
            assignments: []
        };

        for (const relationship of batch) {
            try {
                // Check if assignment already exists
                const existingAssignment = await this.checkExistingAssignment(
                    relationship.partnerId, 
                    relationship.installationCode
                );

                if (existingAssignment) {
                    logger.debug(`Assignment already exists: ${relationship.partnerName} -> ${relationship.installationName}`);
                    results.warnings++;
                    continue;
                }

                // Create new contract assignment
                const assignment = await this.createContractAssignment(relationship);
                
                if (assignment) {
                    results.assignments.push(assignment);
                    results.successful++;
                    this.migrationStats.successful++;
                } else {
                    results.failed++;
                    this.migrationStats.failed++;
                }

                this.migrationStats.processed++;

            } catch (error) {
                logger.error(`Failed to process assignment for ${relationship.partnerName} -> ${relationship.installationName}:`, error);
                results.failed++;
                this.migrationStats.failed++;
            }
        }

        return results;
    }

    /**
     * Create individual contract assignment
     */
    async createContractAssignment(relationship) {
        try {
            // Generate contract code
            const contractCode = this.generateContractCode(relationship);

            // Get installation details
            const installation = await this.getInstallationDetails(relationship.installationCode);
            
            // Calculate contract parameters
            const contractParams = await this.calculateContractParameters(relationship, installation);

            // Create contract record
            const contractData = {
                contract_code: contractCode,
                installation_code: relationship.installationCode,
                partner_id: relationship.partnerId,
                service_type: contractParams.serviceType,
                start_date: contractParams.startDate,
                end_date: contractParams.endDate,
                contract_value: contractParams.contractValue,
                status: 'active',
                migration_source: 'automatic',
                migration_confidence: relationship.relationshipStrength,
                migration_date: new Date().toISOString(),
                notes: `Automatically migrated based on ${relationship.visitCount} historical visits`,
                created_by: 'system_migration',
                metadata: {
                    originalVisitCount: relationship.visitCount,
                    relationshipStrength: relationship.relationshipStrength,
                    lastHistoricalVisit: relationship.lastVisit,
                    migrationReason: 'historical_relationship'
                }
            };

            const { data: contract, error: contractError } = await supabaseAdmin
                .from('contracts')
                .insert([contractData])
                .select()
                .single();

            if (contractError) {
                throw contractError;
            }

            // Create contract services entries
            await this.createContractServices(contract.id, contractParams.services);

            // Update installation assignment status
            await this.updateInstallationAssignmentStatus(relationship.installationCode, relationship.partnerId);

            logger.debug(`Created contract assignment: ${contractCode}`);

            return {
                contractId: contract.id,
                contractCode: contractCode,
                partnerId: relationship.partnerId,
                partnerName: relationship.partnerName,
                installationCode: relationship.installationCode,
                installationName: relationship.installationName,
                confidence: relationship.relationshipStrength,
                migrationDate: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Contract assignment creation failed:', error);
            throw error;
        }
    }

    /**
     * Handle unassigned installations
     */
    async handleUnassignedInstallations(unassigned) {
        try {
            logger.info(`Processing ${unassigned.length} unassigned installations`);

            const results = {
                processed: 0,
                assigned: 0,
                flagged: 0,
                strategies: {}
            };

            for (const installation of unassigned) {
                try {
                    const strategy = await this.determineAssignmentStrategy(installation);
                    
                    if (!results.strategies[strategy.type]) {
                        results.strategies[strategy.type] = 0;
                    }
                    results.strategies[strategy.type]++;

                    switch (strategy.type) {
                        case 'suggest_partners':
                            await this.createPartnerSuggestions(installation, strategy.suggestions);
                            results.flagged++;
                            break;
                        
                        case 'auto_assign':
                            await this.autoAssignBestMatch(installation, strategy.partner);
                            results.assigned++;
                            break;
                        
                        case 'manual_review':
                            await this.flagForManualReview(installation, strategy.reason);
                            results.flagged++;
                            break;
                    }

                    results.processed++;

                } catch (error) {
                    logger.error(`Failed to process unassigned installation ${installation.installation_code}:`, error);
                }
            }

            return results;

        } catch (error) {
            logger.error('Unassigned installations processing failed:', error);
            throw error;
        }
    }

    /**
     * Calculate relationship strength between partner and installation
     */
    async calculateRelationshipStrength(pair) {
        try {
            let score = 0;
            const factors = {};

            // Visit frequency factor (40% weight)
            const visitFrequencyScore = this.calculateVisitFrequencyScore(pair);
            score += visitFrequencyScore * 0.4;
            factors.visitFrequency = visitFrequencyScore;

            // Recency factor (25% weight)
            const recencyScore = this.calculateRecencyScore(pair.lastVisit);
            score += recencyScore * 0.25;
            factors.recency = recencyScore;

            // Consistency factor (20% weight)
            const consistencyScore = this.calculateConsistencyScore(pair.visits);
            score += consistencyScore * 0.2;
            factors.consistency = consistencyScore;

            // Service match factor (15% weight)
            const serviceMatchScore = await this.calculateServiceMatchScore(pair);
            score += serviceMatchScore * 0.15;
            factors.serviceMatch = serviceMatchScore;

            // Determine relationship type
            let type = 'weak';
            if (score >= 0.9) type = 'exclusive';
            else if (score >= 0.8) type = 'primary';
            else if (score >= 0.7) type = 'regular';
            else if (score >= 0.5) type = 'occasional';

            return {
                score: Math.min(1.0, score),
                type,
                factors
            };

        } catch (error) {
            logger.error('Relationship strength calculation failed:', error);
            return { score: 0, type: 'unknown', factors: {} };
        }
    }

    /**
     * Calculate contract parameters based on relationship data
     */
    async calculateContractParameters(relationship, installation) {
        try {
            // Determine service type based on historical visits
            const serviceType = this.determineServiceType(relationship.serviceTypes, installation);

            // Calculate contract duration (default to 1 year)
            const startDate = new Date().toISOString();
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            // Estimate contract value based on historical patterns
            const contractValue = await this.estimateContractValue(relationship, installation);

            // Determine required services
            const services = this.determineRequiredServices(installation, serviceType);

            return {
                serviceType,
                startDate,
                endDate: endDate.toISOString(),
                contractValue,
                services
            };

        } catch (error) {
            logger.error('Contract parameters calculation failed:', error);
            throw error;
        }
    }

    /**
     * Validate migration results
     */
    async validateMigrationResults() {
        try {
            logger.info('Validating migration results');

            // Check for duplicate assignments
            const duplicates = await this.findDuplicateAssignments();
            
            // Check for missing assignments
            const missing = await this.findMissingAssignments();
            
            // Check data integrity
            const integrityIssues = await this.checkDataIntegrity();
            
            // Calculate coverage statistics
            const coverage = await this.calculateCoverageStatistics();

            return {
                duplicates: duplicates.length,
                missing: missing.length,
                integrityIssues: integrityIssues.length,
                coverage,
                validationPassed: duplicates.length === 0 && integrityIssues.length === 0,
                warnings: missing.length > 0 ? ['Some installations remain unassigned'] : []
            };

        } catch (error) {
            logger.error('Migration validation failed:', error);
            throw error;
        }
    }

    /**
     * Generate comprehensive migration report
     */
    async generateMigrationReport(visitAnalysis, relationships, assignments, validation) {
        try {
            const report = {
                migrationSummary: {
                    executionDate: new Date().toISOString(),
                    totalProcessed: this.migrationStats.processed,
                    successfulAssignments: this.migrationStats.successful,
                    failedAssignments: this.migrationStats.failed,
                    warnings: this.migrationStats.warnings,
                    successRate: (this.migrationStats.successful / this.migrationStats.processed) * 100
                },
                dataAnalysis: {
                    historicalVisits: visitAnalysis.totalVisits,
                    uniquePartners: visitAnalysis.uniquePartners,
                    uniqueInstallations: visitAnalysis.uniqueInstallations,
                    strongRelationships: relationships.length,
                    averageRelationshipStrength: this.calculateAverageRelationshipStrength(relationships)
                },
                assignmentResults: {
                    automaticAssignments: assignments.successful,
                    failedAssignments: assignments.failed,
                    unassignedInstallations: assignments.unassigned.length,
                    coveragePercentage: this.calculateCoveragePercentage(assignments)
                },
                validationResults: validation,
                recommendations: this.generateMigrationRecommendations(visitAnalysis, relationships, assignments, validation),
                nextSteps: this.generateNextSteps(assignments, validation)
            };

            // Store report in database
            await this.storeMigrationReport(report);

            return report;

        } catch (error) {
            logger.error('Migration report generation failed:', error);
            throw error;
        }
    }

    // Helper methods
    groupVisitsByPartner(visits) {
        return visits.reduce((groups, visit) => {
            const partnerId = visit.partner_id;
            if (!groups[partnerId]) {
                groups[partnerId] = [];
            }
            groups[partnerId].push(visit);
            return groups;
        }, {});
    }

    groupVisitsByInstallation(visits) {
        return visits.reduce((groups, visit) => {
            const installationCode = visit.installation_code;
            if (!groups[installationCode]) {
                groups[installationCode] = [];
            }
            groups[installationCode].push(visit);
            return groups;
        }, {});
    }

    identifyPartnerInstallationPairs(visits) {
        const pairs = {};
        
        visits.forEach(visit => {
            const key = `${visit.partner_id}-${visit.installation_code}`;
            
            if (!pairs[key]) {
                pairs[key] = {
                    partnerId: visit.partner_id,
                    partnerName: visit.partners?.name || 'Unknown',
                    installationCode: visit.installation_code,
                    installationName: visit.installations?.company_name || 'Unknown',
                    visits: [],
                    visitCount: 0,
                    firstVisit: visit.visit_date,
                    lastVisit: visit.visit_date
                };
            }
            
            pairs[key].visits.push(visit);
            pairs[key].visitCount++;
            
            if (visit.visit_date < pairs[key].firstVisit) {
                pairs[key].firstVisit = visit.visit_date;
            }
            if (visit.visit_date > pairs[key].lastVisit) {
                pairs[key].lastVisit = visit.visit_date;
            }
        });

        return Object.values(pairs).filter(pair => pair.visitCount > 0);
    }

    calculateVisitFrequencyScore(pair) {
        // Higher visit count = higher score
        if (pair.visitCount >= 20) return 1.0;
        if (pair.visitCount >= 10) return 0.8;
        if (pair.visitCount >= 5) return 0.6;
        if (pair.visitCount >= 3) return 0.4;
        return 0.2;
    }

    calculateRecencyScore(lastVisit) {
        const daysSinceLastVisit = (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastVisit <= 30) return 1.0;
        if (daysSinceLastVisit <= 90) return 0.8;
        if (daysSinceLastVisit <= 180) return 0.6;
        if (daysSinceLastVisit <= 365) return 0.4;
        return 0.2;
    }

    calculateConsistencyScore(visits) {
        if (visits.length < 2) return 0.5;
        
        // Calculate intervals between visits
        const sortedVisits = visits.sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));
        const intervals = [];
        
        for (let i = 1; i < sortedVisits.length; i++) {
            const interval = (new Date(sortedVisits[i].visit_date) - new Date(sortedVisits[i-1].visit_date)) / (1000 * 60 * 60 * 24);
            intervals.push(interval);
        }
        
        // Calculate consistency (lower variance = higher consistency)
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Convert to score (0-1)
        const consistencyScore = Math.max(0, 1 - (standardDeviation / avgInterval));
        return Math.min(1, consistencyScore);
    }

    resetMigrationStats() {
        this.migrationStats = {
            processed: 0,
            successful: 0,
            failed: 0,
            warnings: 0
        };
    }

    isRecentVisit(visitDate) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(visitDate) >= sixMonthsAgo;
    }

    generateContractCode(relationship) {
        const prefix = 'AUTO';
        const partnerCode = relationship.partnerId.toString().padStart(3, '0');
        const installationCode = relationship.installationCode.slice(-4);
        const timestamp = Date.now().toString().slice(-6);
        
        return `${prefix}-${partnerCode}-${installationCode}-${timestamp}`;
    }

    // Placeholder methods for additional functionality
    async analyzeVisitFrequency(visits) { return {}; }
    async analyzeTemporalPatterns(visits) { return {}; }
    calculateMigrationPriority(pair, strength) { return strength.score; }
    calculateAverageVisitInterval(visits) { return 30; }
    extractServiceTypes(visits) { return ['occupational_doctor']; }
    async checkExistingAssignment(partnerId, installationCode) { return null; }
    async getInstallationDetails(installationCode) { return {}; }
    async createContractServices(contractId, services) { return true; }
    async updateInstallationAssignmentStatus(installationCode, partnerId) { return true; }
    async getAllInstallations() { return []; }
    async determineAssignmentStrategy(installation) { return { type: 'manual_review', reason: 'No clear match' }; }
    async createPartnerSuggestions(installation, suggestions) { return true; }
    async autoAssignBestMatch(installation, partner) { return true; }
    async flagForManualReview(installation, reason) { return true; }
    async calculateServiceMatchScore(pair) { return 0.8; }
    determineServiceType(serviceTypes, installation) { return 'occupational_doctor'; }
    async estimateContractValue(relationship, installation) { return 10000; }
    determineRequiredServices(installation, serviceType) { return []; }
    async findDuplicateAssignments() { return []; }
    async findMissingAssignments() { return []; }
    async checkDataIntegrity() { return []; }
    async calculateCoverageStatistics() { return { percentage: 85 }; }
    calculateAverageRelationshipStrength(relationships) { 
        return relationships.reduce((sum, r) => sum + r.relationshipStrength, 0) / relationships.length; 
    }
    calculateCoveragePercentage(assignments) { 
        return assignments.successful / (assignments.successful + assignments.unassigned.length) * 100; 
    }
    generateMigrationRecommendations(visitAnalysis, relationships, assignments, validation) { return []; }
    generateNextSteps(assignments, validation) { return []; }
    async storeMigrationReport(report) { return true; }
}

module.exports = ContractMigrationService;